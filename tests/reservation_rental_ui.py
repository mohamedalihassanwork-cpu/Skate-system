"""Reservation execution UI regressions with synthetic API responses only.

Run Vite on 127.0.0.1:5173, then python tests/reservation_rental_ui.py.
No request reaches the backend; mocked POSTs verify the browser contract only.
"""
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright
from desktop_ui_audit import CUSTOMER, RESERVATION, fixture, wrapped

BASE = 'http://127.0.0.1:5173'
OUT = Path(__file__).resolve().parents[1] / 'tmp/reservation-rental-ui'
OUT.mkdir(parents=True, exist_ok=True)
booking = dict(RESERVATION, rentalId=None, reservedFrom='2030-10-24T13:00:00Z', reservedUntil='2030-10-24T14:00:00Z')
checks, errors, unexpected, posts = [], [], [], []
state = {'mode': 'normal', 'failures': 0}


def record(name, passed, **details):
    checks.append(dict(name=name, passed=bool(passed), **details))


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(locale='ar-EG', timezone_id='Africa/Cairo')

    def intercept(route):
        req = route.request
        url = urlparse(req.url)
        path = url.path.removeprefix('/api/v1')
        headers = {'Access-Control-Allow-Origin': BASE, 'Access-Control-Allow-Credentials': 'true',
                   'Access-Control-Allow-Headers': 'content-type,authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
        if req.method == 'OPTIONS':
            route.fulfill(status=204, headers=headers)
            return
        status = 200
        if req.method == 'POST' and path == '/rentals':
            posts.append(req.post_data_json)
            status = 422 if state['mode'] == 'submit-error' else 201
            data = {'error': {'message': 'تم تعديل الحجز، يرجى تحديث البيانات', 'code': 'RESERVATION_MISMATCH'}} if status == 422 else wrapped({'id': 999, 'rentalCode': 'RN-00999'})
        elif req.method != 'GET' and path != '/auth/refresh':
            unexpected.append({'path': path, 'method': req.method})
            status, data = 405, {}
        elif path == '/reservations/1':
            if state['mode'] == 'load-error':
                state['failures'] += 1
                status, data = 503, {'error': {'message': 'تعذر تحميل الحجز'}}
            else:
                data = dict(booking)
                if state['mode'] in ('cancelled', 'fulfilled'):
                    data['status'] = state['mode']
                if state['mode'] == 'fractional':
                    data['reservedUntil'] = '2030-10-24T14:00:30Z'
        elif path == '/rentals/calculate-price':
            if state['mode'] == 'price-error':
                state['failures'] += 1
                status, data = 503, {'error': {'message': 'تعذر تقدير السعر'}}
            else:
                minutes = int(parse_qs(url.query)['durationMinutes'][0])
                data = wrapped({'durationMinutes': minutes, 'pricePerHour': 120, 'rentalAmount': minutes * 2})
        elif path == '/reservations':
            data = {'data': [booking], 'pagination': {'page': 1, 'perPage': 50, 'total': 1, 'totalPages': 1}}
        else:
            try:
                data = fixture(path, parse_qs(url.query))
            except KeyError:
                unexpected.append({'path': path, 'method': req.method})
                status, data = 501, {}
        route.fulfill(status=status, json=data, headers=headers)

    context.route('**/api/v1/**', intercept)
    page = context.new_page()
    page.set_default_timeout(7000)
    page.set_default_navigation_timeout(30000)
    page.on('pageerror', lambda error: errors.append(str(error)))

    def visit(path, mode='normal'):
        state.update(mode=mode, failures=0)
        page.goto(BASE + path, wait_until='networkidle')

    def review():
        page.get_by_role('heading', name='مراجعة الإيجار', exact=True).wait_for()

    for width, height in [(375, 812), (820, 1180), (1440, 900), (667, 375)]:
        prefix = f'{width}x{height}'
        page.set_viewport_size({'width': width, 'height': height})
        try:
            visit('/reservations')
            page.locator('button[title="تنفيذ الإيجار"]:visible').click()
            review()
            record(prefix + '-direct-review-no-duration-selection', page.locator('#custom-duration,.duration-grid,.step-indicator').count() == 0)
            record(prefix + '-full-duration-and-booked-window', '60 دقيقة' in page.locator('.reservation-review').inner_text() and page.locator('.reservation-review time').count() == 2)
            record(prefix + '-actual-start-explained', 'وقت البدء الفعلي' in page.locator('.reservation-review').inner_text())
            record(prefix + '-rtl-no-horizontal-overflow', page.evaluate("getComputedStyle(document.body).direction==='rtl' && document.documentElement.scrollWidth<=innerWidth"))
            page.evaluate('scrollTo(0, 0)')
            page.screenshot(path=str(OUT / (prefix + '-review.png')), full_page=False)
            page.locator('#start-rental-btn').scroll_into_view_if_needed()
            box = page.locator('#start-rental-btn').bounding_box()
            record(prefix + '-start-reachable', box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1 and box['y'] >= 0 and box['y'] + box['height'] <= height + 1)
            page.screenshot(path=str(OUT / (prefix + '-actions.png')), full_page=False)
            page.locator('#start-rental-btn').click()
            page.wait_for_url('**/rentals/active')
            record(prefix + '-reservation-payload', posts[-1] == {'customerId': booking['customer']['id'], 'skateIds': [booking['skate']['id']], 'reservationId': 1})
        except Exception as error:
            record(prefix + '-flow', False, error=str(error).splitlines()[0])

    for mode in ['cancelled', 'fulfilled', 'fractional']:
        visit('/rentals/new?reservationId=1', mode)
        record(mode + '-blocked-without-walk-in', page.locator('#reservation-retry').is_visible() and page.locator('#start-rental-btn,#customer-search').count() == 0)
    visit('/rentals/new?reservationId=bad')
    record('invalid-id-blocked', page.locator('#reservation-retry').is_visible() and page.locator('#start-rental-btn,#customer-search').count() == 0)

    for mode in ['load-error', 'price-error']:
        visit('/rentals/new?reservationId=1', mode)
        record(mode + '-blocks-start', page.locator('#start-rental-btn').count() == 0)
        state['mode'] = 'normal'
        page.locator('#reservation-retry').click()
        review()
        record(mode + '-retry-recovers-review', page.locator('#start-rental-btn').is_visible())

    visit('/rentals/new?reservationId=1', 'submit-error')
    review()
    page.locator('#start-rental-btn').click()
    page.locator('#reservation-review-retry').wait_for()
    record('submit-failure-retains-reservation', page.locator('.reservation-review').is_visible())
    state['mode'] = 'normal'
    page.locator('#reservation-review-retry').click()
    review()
    record('submit-failure-refresh-recovers', page.locator('#reservation-review-retry').count() == 0)
    page.locator('#back-to-reservations').click()
    page.wait_for_url('**/reservations')
    record('reservation-back-destination', True)

    visit('/rentals/new')
    page.locator('#customer-search').fill(CUSTOMER['phone'])
    page.get_by_text(CUSTOMER['name'], exact=True).first.click()
    page.locator('.skate-card').first.click()
    page.locator('#proceed-to-duration').click()
    page.locator('#duration-btn-custom').click()
    page.locator('#custom-duration').fill('45')
    page.locator('#proceed-to-review').click()
    review()
    record('walk-in-keeps-duration-wizard', page.locator('.step-indicator').count() == 1 and page.locator('.reservation-review').count() == 0)
    page.locator('#start-rental-btn').click()
    page.wait_for_url('**/rentals/active')
    record('walk-in-request-unchanged', posts[-1].get('durationMinutes') == 45 and 'reservationId' not in posts[-1])

    visit('/rentals/new?reservationId=1')
    review()
    page.locator('#rental-notes').fill('A prior reservation draft')
    page.evaluate("history.pushState({}, '', '/rentals/new'); dispatchEvent(new PopStateEvent('popstate'))")
    page.locator('#customer-search').wait_for()
    record('route-change-clears-reservation-draft', page.locator('.reservation-review,#start-rental-btn').count() == 0)
    browser.close()

record('no-browser-runtime-errors', not errors, errors=errors)
record('no-unhandled-api-requests', not unexpected, requests=unexpected)
report = {'checks': len(checks), 'failures': [check for check in checks if not check['passed']], 'results': checks}
(OUT / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key != 'results'}, ensure_ascii=True))
raise SystemExit(1 if report['failures'] else 0)
