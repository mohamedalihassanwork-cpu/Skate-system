"""Isolated Treasury UI verification; no API/database business requests reach a server.

Run Vite separately, then: python tests/treasury_balance_ui.py
Reuses desktop synthetic identity/fixtures. Only the expense-success scenario permits
one POST, fulfilled entirely in the browser interceptor. Every other business write
and every unknown API endpoint fails the audit. Evidence goes to an ignored folder.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
from decimal import Decimal
import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright
from desktop_ui_audit import ROOT, USER, SHIFT, EXPENSE, TREASURY_SUMMARY, fixture, wrapped

VIEWPORTS = [(375, 812), (768, 1024), (1024, 768), (1440, 900)]
ALL = ['treasury.view', 'shifts.manage', 'expenses.view', 'expenses.create']
FIXED_DATE = """const NativeDate=Date; class FixedDate extends NativeDate {
constructor(...args){super(...(args.length?args:['2026-10-15T12:00:00.000Z']));}
static now(){return 1792065600000;}} window.Date=FixedDate;"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5173')
    args = parser.parse_args()
    out = ROOT / 'tests/desktop-artifacts/treasury-balance'
    out.mkdir(parents=True, exist_ok=True)
    checks, scenarios, blocked = [], [], []

    def record(name, passed, **detail):
        checks.append(dict(name=name, passed=bool(passed), **detail))

    def account_money(page, index):
        return page.locator('.treasury-balance-account-amount').nth(index)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, channel='chrome')

        def run_case(name, width=1440, height=900, permissions=None, setup=None, action=None):
            state = dict(summary=deepcopy(TREASURY_SUMMARY), shift=deepcopy(SHIFT),
                         summary_error=False, shift_error=False, expense_error=False,
                         hold_summary=False, pending=[], allow_expense=False, writes=[],
                         requests=[], errors=[], unhandled=[])
            if setup:
                setup(state)
            permissions = ALL if permissions is None else permissions
            context = browser.new_context(viewport=dict(width=width, height=height),
                                          locale='ar-EG', timezone_id='Africa/Cairo',
                                          reduced_motion='reduce', service_workers='block')
            context.add_init_script(FIXED_DATE)
            cors = {'Access-Control-Allow-Origin': args.url,
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers': 'content-type,authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}

            def intercept(route):
                req = route.request
                uri = urlparse(req.url)
                path = uri.path.removeprefix('/api/v1')
                if req.method == 'OPTIONS':
                    route.fulfill(status=204, headers=cors)
                    return
                state['requests'].append(dict(path=path, method=req.method))
                if req.method == 'POST' and path == '/expenses' and state['allow_expense']:
                    payload = req.post_data_json
                    state['writes'].append(payload)
                    amount = Decimal(str(payload['amount']))
                    summary = state['summary']
                    for field in ['totalBalance', 'cashBalance']:
                        summary[field] = format(Decimal(summary[field]) - amount, '.2f')
                    cash = summary['accounts'][0]
                    for field in ['balance', 'storedBalance']:
                        cash[field] = format(Decimal(cash[field]) - amount, '.2f')
                    cash['movementCount'] += 1
                    summary['asOf'] = '2026-10-15T12:01:00.000Z'
                    route.fulfill(status=201, json=wrapped(dict(EXPENSE, **payload)), headers=cors)
                    return
                if req.method != 'GET' and not (req.method == 'POST' and path == '/auth/refresh'):
                    violation = dict(case=name, path=path, method=req.method, blockedWrite=True)
                    state['unhandled'].append(violation)
                    blocked.append(violation)
                    route.fulfill(status=405, json={'error': {'message': 'Synthetic writes disabled'}}, headers=cors)
                    return
                status = 200
                data = None
                if path == '/auth/me':
                    data = wrapped({'user': dict(USER, permissions=permissions, roles=[])})
                elif path == '/payments/treasury-summary':
                    if state['hold_summary']:
                        state['pending'].append(route)
                        return
                    if state['summary_error']:
                        status = 500
                    else:
                        data = wrapped(deepcopy(state['summary']))
                elif path == '/shifts/current':
                    if state['shift_error']:
                        status = 500
                    else:
                        data = state['shift']
                elif path == '/expenses':
                    if state['expense_error']:
                        status = 500
                    else:
                        data = wrapped([EXPENSE])
                elif path in ['/auth/refresh', '/settings', '/notifications']:
                    data = fixture(path, parse_qs(uri.query))
                else:
                    violation = dict(case=name, path=path, method=req.method)
                    state['unhandled'].append(violation)
                    blocked.append(violation)
                    status = 501
                if status != 200:
                    data = {'success': False, 'error': {'code': 'SYNTHETIC_ERROR', 'message': 'خطأ تجريبي مقصود'}}
                route.fulfill(status=status, json=data, headers=cors)

            context.route('**/api/v1/**', intercept)
            page = context.new_page()
            page.set_default_timeout(5000)
            page.on('pageerror', lambda exc: state['errors'].append(str(exc)))
            prefix = f'{width}x{height}-{name}'
            try:
                page.goto(args.url + '/treasury', wait_until='domcontentloaded')
                if 'treasury.view' in permissions or 'shifts.manage' in permissions:
                    expect(page.locator('.treasury-page')).to_be_visible()
                    if 'treasury.view' in permissions:
                        expect(page.get_by_role('heading', name='الرصيد المتاح المسجل', exact=True)).to_be_visible()
                        if not state['hold_summary']:
                            if state['summary_error']:
                                expect(page.get_by_text('تعذر تحميل الرصيد', exact=True)).to_be_visible()
                            else:
                                expect(page.locator('.treasury-balance-total')).to_be_visible()
                    expect(page.get_by_role('heading', name='حالة الوردية', exact=True)).to_be_visible()
                else:
                    page.wait_for_load_state('networkidle')
                if action:
                    action(page, state, prefix)
                metrics = page.evaluate("""() => ({
                    direction: getComputedStyle(document.body).direction,
                    width: innerWidth, documentWidth: document.documentElement.scrollWidth,
                    panel: (() => {const el=document.querySelector('.treasury-balance');
                        if(!el)return null; const r=el.getBoundingClientRect();
                        return {x:r.x,right:r.right,width:r.width,scroll:el.scrollWidth,client:el.clientWidth};})()
                })""")
                record(prefix + '-rtl-no-overflow',
                       metrics['direction'] == 'rtl' and metrics['documentWidth'] <= width + 1
                       and (metrics['panel'] is None or metrics['panel']['scroll'] <= metrics['panel']['client'] + 1),
                       metrics=metrics)
                money_directions = page.locator('.treasury-balance bdi').evaluate_all(
                    "els=>els.map(el=>({text:el.textContent,direction:getComputedStyle(el).direction}))")
                if money_directions:
                    record(prefix + '-money-ltr', all(x['direction'] == 'ltr' for x in money_directions),
                           amounts=money_directions)
                page.evaluate('window.scrollTo(0, 0)')
                page.screenshot(path=str(out / (prefix + '.png')), full_page=True)
            except Exception as exc:
                record(prefix + '-scenario', False, error=str(exc).splitlines()[0])
                page.screenshot(path=str(out / (prefix + '-failure.png')), full_page=True)
            finally:
                record(prefix + '-no-runtime-errors', not state['errors'], errors=state['errors'])
                record(prefix + '-known-api-only', not state['unhandled'], unhandled=state['unhandled'])
                scenarios.append(dict(name=prefix, requests=state['requests'], simulatedWrites=state['writes']))
                for pending in state['pending']:
                    pending.fulfill(status=503, json={'error': {'message': 'Test finished'}}, headers=cors)
                context.close()
            print(prefix, flush=True)

        def assert_numbers(page, state, prefix):
            expect(page.locator('.treasury-balance-total')).to_have_text('1,469.12 ج.م')
            expect(page.locator('.treasury-balance-breakdown dd').nth(0)).to_have_text('1,234.56 ج.م')
            expect(page.locator('.treasury-balance-breakdown dd').nth(1)).to_have_text('234.56 ج.م')
            expect(account_money(page, 0)).to_have_text('1,234.56 ج.م')
            expect(account_money(page, 1)).to_have_text('250.25 ج.م')
            expect(account_money(page, 2)).to_have_text('-15.69 ج.م')
            expect(page.locator('.treasury-balance-accounts').get_by_text('غير نشط', exact=True)).to_be_visible()
            expect(page.get_by_text('توجد فروق تحتاج إلى مراجعة', exact=True)).to_be_visible()
            expect(page.locator('.treasury-balance-discrepancy')).to_contain_text('-34.56 ج.م')
            expect(page.locator('.treasury-balance time')).to_have_attribute('datetime', state['summary']['asOf'])
            refresh = page.get_by_role('button', name='تحديث الرصيد', exact=True)
            refresh.focus()
            accessible = refresh.evaluate("""el => { const r=el.getBoundingClientRect();
                return {focused:el===document.activeElement,width:r.width,height:r.height};}""")
            record(prefix + '-refresh-keyboard-touch',
                   accessible['focused'] and accessible['width'] >= 44 and accessible['height'] >= 44,
                   metrics=accessible)
            record(prefix + '-exact-totals-breakdown-inactive-discrepancy', True)

        for width, height in VIEWPORTS:
            run_case('balances', width, height, action=assert_numbers)

        def no_shift(page, state, prefix):
            assert_numbers(page, state, prefix)
            expect(page.get_by_text('لا توجد وردية نشطة حالياً.', exact=False)).to_be_visible()
            record(prefix + '-totals-without-shift', True)
        run_case('no-shift', 375, 812, setup=lambda s: s.update(shift=None), action=no_shift)

        def view_only(page, state, prefix):
            assert_numbers(page, state, prefix)
            expect(page.locator('a[href="/treasury"]')).to_have_count(1)
            for label in ['إغلاق وتصفية', 'فتح الوردية', 'إضافة مصروف']:
                expect(page.get_by_role('button', name=label, exact=True)).to_have_count(0)
            record(prefix + '-view-only-navigation-no-mutations', True)
            record(prefix + '-no-expense-data-request',
                   not any(r['path'] == '/expenses' for r in state['requests']))
        run_case('treasury-view-only', permissions=['treasury.view'], action=view_only)

        def shift_only(page, state, prefix):
            expect(page.locator('a[href="/treasury"]')).to_have_count(1)
            expect(page.locator('.treasury-balance')).to_have_count(0)
            expect(page.get_by_role('button', name='إغلاق وتصفية', exact=True)).to_be_visible()
            expect(page.get_by_role('button', name='إضافة مصروف', exact=True)).to_have_count(0)
            record(prefix + '-shift-access-no-summary-call',
                   not any(r['path'] == '/payments/treasury-summary' for r in state['requests']))
        run_case('shifts-manage-only', 768, 1024, permissions=['shifts.manage'], action=shift_only)

        def denied(page, state, prefix):
            expect(page.locator('a[href="/treasury"]')).to_have_count(0)
            expect(page.locator('.treasury-page')).to_have_count(0)
            record(prefix + '-denied-no-business-read',
                   not any(r['path'] in ['/payments/treasury-summary', '/shifts/current', '/expenses']
                           for r in state['requests']))
        run_case('no-permissions', permissions=[], action=denied)

        run_case('shift-read-error', setup=lambda s: s.update(shift_error=True), action=assert_numbers)
        run_case('expense-read-error', 375, 812,
                 setup=lambda s: s.update(expense_error=True), action=assert_numbers)

        def summary_failure(page, state, prefix):
            expect(page.locator('.treasury-balance-total')).to_have_count(0)
            expect(page.locator('.treasury-balance time')).to_have_count(0)
            expect(page.get_by_role('button', name='إغلاق وتصفية', exact=True)).to_be_visible()
            record(prefix + '-unavailable-not-zero-independent-shift', True)
        run_case('initial-summary-error', 375, 812,
                 setup=lambda s: s.update(summary_error=True), action=summary_failure)

        def refreshes(page, state, prefix):
            button = page.get_by_role('button', name='تحديث الرصيد', exact=True)
            state['summary']['asOf'] = '2026-10-15T12:02:00.000Z'
            with page.expect_request('**/api/v1/payments/treasury-summary'):
                button.click()
            expect(page.locator('.treasury-balance time')).to_have_attribute('datetime', state['summary']['asOf'])
            record(prefix + '-manual-refresh', True)
            state['summary']['asOf'] = '2026-10-15T12:03:00.000Z'
            with page.expect_request('**/api/v1/payments/treasury-summary'):
                page.evaluate("window.dispatchEvent(new Event('focus'))")
            expect(page.locator('.treasury-balance time')).to_have_attribute('datetime', state['summary']['asOf'])
            record(prefix + '-focus-refresh', True)
            state['summary_error'] = True
            button.click()
            expect(page.get_by_text('تعذر تحميل الرصيد', exact=True)).to_be_visible()
            expect(page.locator('.treasury-balance-total')).to_have_count(0)
            expect(page.locator('.treasury-balance time')).to_have_count(0)
            record(prefix + '-failed-refresh-hides-stale-values', True)
            state['summary_error'] = False
            button.click()
            expect(page.locator('.treasury-balance-total')).to_have_text('1,469.12 ج.م')
            record(prefix + '-retry-restores-summary', True)
        run_case('refreshes', action=refreshes)

        def loading(page, state, prefix):
            expect(page.get_by_text('جارٍ تحديث الرصيد…', exact=True)).to_be_visible()
            expect(page.get_by_role('button', name='تحديث الرصيد', exact=True)).to_be_disabled()
            expect(page.locator('.treasury-balance-total')).to_have_count(0)
            record(prefix + '-loading-no-false-zero', True)
            state['hold_summary'] = False
            pending, state['pending'] = state['pending'], []
            for route in pending:
                route.fulfill(status=200, json=wrapped(state['summary']),
                              headers={'Access-Control-Allow-Origin': args.url,
                                       'Access-Control-Allow-Credentials': 'true'})
            expect(page.locator('.treasury-balance-total')).to_have_text('1,469.12 ج.م')
        run_case('loading', setup=lambda s: s.update(hold_summary=True), action=loading)

        def empty(page, state, prefix):
            expect(page.locator('.treasury-balance-total')).to_have_text('0.00 ج.م')
            expect(page.get_by_text('لا توجد حسابات خزينة مسجلة.', exact=True)).to_be_visible()
            record(prefix + '-empty-explicit-zero', True)
        run_case('empty', setup=lambda s: s['summary'].update(accounts=[], totalBalance='0.00',
                 cashBalance='0.00', nonCashBalance='0.00', hasDiscrepancies=False), action=empty)

        def expense_success(page, state, prefix):
            expect(page.get_by_role('button', name='إغلاق وتصفية', exact=True)).to_have_count(0)
            page.get_by_role('button', name='إضافة مصروف', exact=True).click()
            page.get_by_label('المبلغ', exact=False).fill('1.11')
            page.get_by_label('بيان المصروف', exact=False).fill('مصروف اصطناعي معزول')
            before = sum(r['path'] == '/payments/treasury-summary' for r in state['requests'])
            page.get_by_role('button', name='تسجيل', exact=True).click()
            expect(page.locator('.treasury-balance-total')).to_have_text('1,468.01 ج.م')
            expect(page.locator('.treasury-balance time')).to_have_attribute('datetime', '2026-10-15T12:01:00.000Z')
            after = sum(r['path'] == '/payments/treasury-summary' for r in state['requests'])
            record(prefix + '-simulated-expense-refresh', after > before and len(state['writes']) == 1,
                   simulatedWrites=state['writes'])
        run_case('simulated-expense-success', 375, 812,
                 permissions=['treasury.view', 'expenses.view', 'expenses.create'],
                 setup=lambda s: s.update(allow_expense=True), action=expense_success)


        def huge(page, state, prefix):
            expect(page.locator('.treasury-balance-total')).to_have_text('9,007,199,254,740,992.01 ج.م')
            expect(page.locator('.treasury-balance-breakdown dd').nth(0)).to_have_text('9,007,199,254,740,992.01 ج.م')
            expect(account_money(page, 0)).to_have_text('9,007,199,254,740,992.01 ج.م')
            record(prefix + '-huge-exact-decimal-no-rounding', True)

        def huge_fixture(state):
            summary = state['summary']
            summary.update(totalBalance='9007199254740992.01', cashBalance='9007199254740992.01',
                           nonCashBalance='0.00', hasDiscrepancies=False)
            summary['accounts'] = [dict(summary['accounts'][0], balance='9007199254740992.01',
                                        storedBalance='9007199254740992.01', difference='0.00')]

        for width, height in [(375, 812), (1440, 900)]:
            run_case('huge-decimal', width, height, setup=huge_fixture, action=huge)


        browser.close()

    result = dict(synthetic=True, realBusinessWrites=0, checks=checks, scenarios=scenarios,
                  blocked=blocked, passed=sum(c['passed'] for c in checks),
                  failed=sum(not c['passed'] for c in checks))
    (out / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: result[k] for k in ['passed', 'failed', 'realBusinessWrites']}), flush=True)
    raise SystemExit(1 if result['failed'] else 0)


if __name__ == '__main__':
    main()
