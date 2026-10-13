"""Extra isolated operational and normal-motion checks. No business writes."""
import json
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
from desktop_ui_audit import fixture,wrapped,CUSTOMER,MAINTENANCE
from mobile_tablet_ui_audit import ARTIFACTS,FIXED_DATE,RESPONSIVE,contained,mobile_control_failures
out=ARTIFACTS/'mobile-20261013-operations';out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];unhandled=[];scenario=['normal']
def record(name,passed,**details): checks.append(dict(name=name,passed=bool(passed),**details))
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    ctx=browser.new_context(locale='ar-EG',timezone_id='Africa/Cairo',has_touch=True,reduced_motion='no-preference')
    ctx.add_init_script(FIXED_DATE)
    def intercept(route):
        req=route.request;u=urlparse(req.url);path=u.path.removeprefix('/api/v1')
        h={'Access-Control-Allow-Origin':'http://127.0.0.1:5173','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,authorization'}
        if req.method=='OPTIONS': route.fulfill(status=204,headers=h);return
        if req.method!='GET' and path!='/auth/refresh':
            unhandled.append(dict(path=path,method=req.method));route.fulfill(status=405,json={},headers=h);return
        try:
            data=fixture(path,parse_qs(u.query));status=200
            if scenario[0]=='completed' and path=='/maintenance':
                data=dict(success=True,records=[dict(MAINTENANCE,status='completed')],pagination=dict(page=1,limit=20,total=1,totalPages=1))
            if scenario[0]=='completed' and path=='/maintenance/1': data=wrapped(dict(MAINTENANCE,status='completed'))
        except KeyError:
            unhandled.append(dict(path=path,method=req.method));data={};status=501
        route.fulfill(status=status,json=data,headers=h)
    ctx.route('**/api/v1/**',intercept)
    page=ctx.new_page();page.set_default_timeout(5000);page.on('pageerror',lambda e:errors.append(str(e)))
    for width,height in [(375,812),(820,1180),(667,375)]:
        page.set_viewport_size(dict(width=width,height=height));prefix=f'{width}x{height}'
        def visit(path):
            page.goto('http://127.0.0.1:5173'+path,wait_until='networkidle');page.wait_for_timeout(350)
        def inspect(name,dialog=None):
            page.wait_for_timeout(350)
            issues=mobile_control_failures(page.evaluate(RESPONSIVE),width)
            record(prefix+'-'+name+'-controls',not issues,issues=issues)
            record(prefix+'-'+name+'-width',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            if dialog is not None:
                record(prefix+'-'+name+'-dialog-bounds',contained(dialog))
                action=dialog.locator('button:visible').last;action.scroll_into_view_if_needed()
                record(prefix+'-'+name+'-last-action',contained(action))
            page.screenshot(path=str(out/f'{prefix}-{name}.png'),full_page=False)
        try:
            visit('/rentals/new');page.locator('#customer-search').fill(CUSTOMER['phone'])
            page.get_by_text(CUSTOMER['name'],exact=True).first.click()
            record(prefix+'-search-names',bool(page.locator('#skate-search').get_attribute('aria-label')))
            page.locator('.skate-card').first.click()
            record(prefix+'-selected-skate',page.locator('.skate-card').first.get_attribute('aria-pressed')=='true')
            page.locator('#proceed-to-duration').click();page.locator('#duration-btn-custom').click();page.locator('#custom-duration').fill('45')
            record(prefix+'-custom-duration-state',page.locator('#duration-btn-custom').get_attribute('aria-pressed')=='true')
            inspect('duration');page.locator('#proceed-to-review').click();page.locator('#rental-notes').fill(CUSTOMER['notes'])
            page.locator('#start-rental-btn').scroll_into_view_if_needed();inspect('rental-review')
            record(prefix+'-rental-submit-reachable',contained(page.locator('#start-rental-btn')))
        except Exception as e:record(prefix+'-rental-wizard',False,error=str(e).splitlines()[0])
        try:
            visit('/damages');page.locator('.ds-table tbody tr').first.click();dialog=page.get_by_role('dialog');dialog.wait_for(state='visible')
            for i,name in enumerate(['damage-details','damage-collect','damage-waive']):
                tab=page.locator('.damage-tabs button').nth(i);tab.click()
                record(prefix+'-'+name+'-selected',tab.get_attribute('aria-pressed')=='true');inspect(name,dialog)
            page.keyboard.press('Escape');dialog.wait_for(state='hidden')
        except Exception as e:record(prefix+'-damage',False,error=str(e).splitlines()[0])
        try:
            scenario[0]='normal';visit('/maintenance');page.locator('.ds-table tbody tr').first.click()
            dialog=page.get_by_role('dialog');dialog.wait_for(state='visible');page.locator('#partName').fill('Fixture part');page.locator('#partQty').fill('2')
            inspect('maintenance-edit',dialog);page.keyboard.press('Escape');dialog.wait_for(state='hidden')
            scenario[0]='completed';visit('/maintenance');page.locator('.ds-table tbody tr button').first.click()
            dialog=page.get_by_role('dialog');dialog.wait_for(state='visible');page.locator('#paymentMethodId').wait_for(state='visible')
            inspect('maintenance-payment',dialog);page.keyboard.press('Escape');dialog.wait_for(state='hidden');scenario[0]='normal'
        except Exception as e:record(prefix+'-maintenance',False,error=str(e).splitlines()[0]);scenario[0]='normal'
        try:
            visit('/sales');page.get_by_role('button',name='التفاصيل',exact=True).first.click()
            parent=page.get_by_role('dialog').first;parent.wait_for(state='visible');page.wait_for_timeout(350)
            parent.get_by_role('button',name='إلغاء الفاتورة واسترجاع المخزون',exact=True).click()
            child=page.get_by_role('dialog',name='إلغاء الفاتورة',exact=True);child.wait_for(state='visible');page.wait_for_timeout(350)
            header=parent.locator('.modal-header')
            blocked=header.evaluate('el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !el.contains(hit)}')
            record(prefix+'-nested-parent-pointer-blocked',blocked);inspect('nested-normal-motion',child)
            page.keyboard.press('Escape');child.wait_for(state='hidden');record(prefix+'-parent-survives',parent.is_visible())
            page.keyboard.press('Escape');parent.wait_for(state='hidden');record(prefix+'-body-unlocked',page.locator('body').evaluate('el=>getComputedStyle(el).overflow!=="hidden"'))
        except Exception as e:record(prefix+'-nested-normal-motion',False,error=str(e).splitlines()[0])
        print(prefix+' operational checks finished',flush=True)
    browser.close()
record('runtime-errors',not errors,errors=errors);record('no-business-writes-or-fixture-misses',not unhandled,unhandled=unhandled)
report=dict(checks=len(checks),failures=[c for c in checks if not c['passed']],results=checks)
(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=True))
raise SystemExit(1 if report['failures'] else 0)
