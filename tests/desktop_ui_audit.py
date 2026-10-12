"""Offline desktop presentation audit. Uses installed Python Playwright, no API/DB.
Run Vite separately, then: python tests/desktop_ui_audit.py --label baseline
All /api/v1 requests are intercepted; non-auth writes fail deliberately.
Synthetic fixtures validate presentation, not backend workflows or financial logic.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
NOW = '2026-10-11T12:00:00.000Z'
PERMISSIONS = sorted(set(re.findall(r"['\"]([a-z_]+\.[a-z_]+)['\"]", '\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'apps/web/src').rglob('*.tsx')))))
PERMS = [dict(id=i+1, key=k, labelAr='صلاحية اختبار '+k, module=k.split('.')[0]) for i,k in enumerate(PERMISSIONS)]
ROLE = dict(id=1, name='desktop_auditor', nameAr='مدير المراجعة', isSystem=False, permissions=PERMS)
USER = dict(id=1, name='مستخدم مراجعة الواجهة', email='desktop-audit@example.test', isActive=True, roles=[ROLE], permissions=PERMISSIONS)
CUSTOMER = dict(id=1, name='عميل تجريبي لمراجعة واجهة سطح المكتب', phone='01000000000', nationalId='00000000000000', nationalIdMasked='****0000', registrationDate='2026-10-01', notes='بيانات اصطناعية لا تمثل عميلاً حقيقياً.', isActive=True, createdAt=NOW, updatedAt=NOW)
SKATES = [dict(id=i, skateCode=f'SK-{i:03}', qrCode=f'SK-{i:03}', barcode=f'SK-{i:03}', size=str(36+i), type='اسكيت للاختبار', status=['available','rented','maintenance','reserved'][((i-1)%4)], condition='good', purchaseDate='2026-01-01', purchaseCost='1200', notes='بيانات اصطناعية', isActive=True, createdAt=NOW, updatedAt=NOW) for i in range(1,9)]
ITEM = dict(id=1, rentalId=1, skate=SKATES[1], startedAt='2026-10-11T11:30:00Z', expectedDurationMinutes=60, expectedEndAt='2026-10-11T12:30:00Z', returnedAt=None, actualDurationMinutes=None, actualAmount=None, pricePerHour=60, inspectionId=None, status='active', operationalStatus='normal', remainingMinutes=30)
RENTAL = dict(id=1, rentalCode='RNT-000001', invoiceNumber='INV-000001', customer=CUSTOMER, cashier=USER, shiftId=1, items=[ITEM], totalAmount=60, startedAt=ITEM['startedAt'], completedAt=None, status='active', notes='إيجار اصطناعي للمراجعة', createdAt=NOW, updatedAt=NOW, hasOverdueItems=False, hasEndingSoonItems=False)
PRODUCTS = [dict(id=i, name=f'product-{i}', nameAr='منتج تجريبي '+str(i), categoryId=1, barcode=f'000{i}', price=25*i, stockQuantity=12, isActive=True) for i in range(1,9)]
SALE = dict(id=1, saleCode='SALE-000001', customerId=1, cashierId=1, shiftId=1, totalAmount=75, status='completed', notes='بيع اصطناعي', createdAt=NOW, items=[dict(id=1,saleId=1,productId=1,quantity=3,unitPrice=25,totalPrice=75)], payments=[dict(id=1,saleId=1,paymentMethodId=1,amount=75,treasuryAccountId=1,createdAt=NOW)])
DAMAGE = dict(id=1, skateId=2, rentalId=1, inspectionId=1, customerId=1, reportedBy=1, damageType='wheel', severity='minor', description='وصف تلف تجريبي لمراجعة عرض النص والتكلفة والإجراءات', customerCharge=100, chargeCollected=0, chargeWaived=0, status='pending', maintenanceRequired=True, createdAt=NOW, skateCode='SK-002', customerName=CUSTOMER['name'], customerNationalId='****0000', reporterName=USER['name'])
MAINTENANCE = dict(id=1, skateId=3, skateCode='SK-003', inspectionId=1, damageReportId=1, problemDescription='وصف مشكلة اصطناعية لاختبار تخطيط سجل الصيانة', repairDescription='إصلاح اختباري', status='pending', paymentStatus='unpaid', laborCost='20', partsCost='30', totalCost='50', createdAt=NOW, startedAt=None, completedAt=None, createdByName=USER['name'], parts=[])
RESERVATION = dict(id=1, customer=CUSTOMER, skate=SKATES[0], skateSize='37', reservedFrom='2026-10-12T12:00:00Z', reservedUntil='2026-10-12T13:00:00Z', status='confirmed', createdBy=USER, notes='حجز تجريبي', createdAt=NOW, updatedAt=NOW)
SHIFT = dict(id=1, cashierId=1, openedAt='2026-10-11T08:00:00Z', closedAt=None, openingBalance=100, expectedBalance=450, actualBalance=None, difference=None, status='active')
EXPENSE = dict(id=1, amount=50, description='مصروف اصطناعي لمراجعة عرض الجدول', categoryId=1, cashierId=1, shiftId=1, createdAt=NOW)
PAYMENTS = [dict(id=1,name='cash',nameAr='نقدي',isActive=True,type='cash',treasuryAccountId=1),dict(id=2,name='card',nameAr='بطاقة',isActive=True,type='card',treasuryAccountId=2)]
AUDIT = dict(id=1, userId=1, userName=USER['name'], action='CREATE', entityType='rental', entityId='1', changes={'new': {'description':'تفاصيل اصطناعية طويلة لمراجعة السجل'}}, ipAddress='127.0.0.1', userAgent='Desktop audit fixture', createdAt=NOW)
ROUTES = ['/login','/','/users','/roles','/skates','/customers','/customers/1','/rentals','/rentals/new','/rentals/active','/rentals/1','/products','/sales-pos','/sales','/reservations','/damages','/treasury','/maintenance','/reports','/settings','/audit-logs']

def wrapped(data): return dict(success=True, data=data)
def paged(data): return dict(success=True, data=data, pagination=dict(page=1,perPage=20,limit=20,total=len(data),totalPages=1))

def fixture(path, query, empty=False):
    def rows(data): return [] if empty else data
    if path=='/auth/refresh': return wrapped({'accessToken':'synthetic-desktop-audit-token'})
    if path=='/auth/me': return wrapped({'user': USER})
    if path=='/notifications': return wrapped([])
    if path=='/settings': return wrapped(dict(print_invoices_enabled=False, notification_sound_enabled=False, rental_hourly_rate=60,rental_duration_options=[30,60,90,120],late_fee_per_minute=1))
    if path=='/users': return wrapped(rows([USER,dict(USER,id=2,name='موظف تجريبي آخر',email='cashier@example.test')]))
    if path=='/roles': return wrapped([ROLE])
    if path=='/roles/permissions': return wrapped(PERMS)
    if path=='/skates': return paged(rows(SKATES))
    if path=='/skates/available': return wrapped(rows([s for s in SKATES if s['status']=='available']))
    if re.fullmatch('/skates/\\d+',path): return wrapped(SKATES[0])
    if path=='/customers': return paged(rows([CUSTOMER]))
    if path=='/customers/1': return wrapped(CUSTOMER)
    if path=='/customers/1/rentals': return paged(rows([RENTAL]))
    if path=='/rentals/config': return wrapped(dict(pricePerHour=60,durationOptions=[30,60,90,120],gracePeriodMinutes=5))
    if path=='/rentals/calculate-price':
        duration=int(query.get('durationMinutes',['60'])[0]);return wrapped(dict(durationMinutes=duration,pricePerHour=60,rentalAmount=duration))
    if path=='/rentals/active': return wrapped(rows([RENTAL]))
    if path=='/rentals': return paged(rows([RENTAL]))
    if path=='/rentals/1': return wrapped(RENTAL)
    if path=='/rental-items/1': return wrapped(ITEM)
    if path=='/products/categories': return wrapped([dict(id=1,name='equipment',nameAr='مستلزمات التزلج')])
    if path=='/products': return wrapped(rows(PRODUCTS))
    if path=='/sales': return wrapped(rows([SALE]))
    if path=='/sales/1': return wrapped(SALE)
    if path=='/damages': return paged(rows([DAMAGE]))
    if path=='/damages/1': return wrapped(DAMAGE)
    if path=='/maintenance': return dict(success=True,records=rows([MAINTENANCE]),pagination=dict(page=1,limit=20,total=1,totalPages=1))
    if path=='/maintenance/1': return wrapped(MAINTENANCE)
    if path=='/reservations': return paged(rows([RESERVATION]))
    if path=='/shifts/current': return SHIFT
    if path=='/expenses': return wrapped(rows([EXPENSE]))
    if path=='/payments/methods': return wrapped(PAYMENTS)
    if path=='/audit-logs': return dict(data=rows([AUDIT]),meta=dict(total=1,page=1,limit=20,totalPages=1))
    if path=='/dashboard/kpis': return wrapped(dict(kpis=dict(revenue=1250,expenses=350,operatingResult=900,collectedLateFees=20,waivedLateFees=0,damageCharges=100,activeRentals=1,lateRentals=0,rentalsPeriod=12,totalSkates=8,skatesByStatus=dict(available=2,rented=2,maintenance=2,reserved=2),endingSoonRentals=[],recentSales=[dict(id=1,customerName=CUSTOMER['name'],totalAmount=75,status='completed',createdAt=NOW,itemName=PRODUCTS[0]['nameAr'])]),charts=dict(revenueOverTime=[dict(date='2026-10-10',total=400),dict(date='2026-10-11',total=850)],expenses=[dict(date='2026-10-11',total=350)],rentalVolume=[dict(date='2026-10-11',count=12)],mostRentedSkates=[dict(skateCode='SK-002',count=8)],skatePerformance=[dict(skateCode='SK-002',revenue=400)])))
    if path=='/reports/overview': return wrapped(dict(totalRevenue=1250,totalExpenses=350,totalRentals=12,activeRentals=1,lateRentals=0,totalDamages=1,activeMaintenance=1))
    if path=='/reports/operating-financial': return wrapped(dict(rentalRevenue=1000,rentalPayments=1000,damageCharges=100,salesRevenue=150,refunds=0,totalRevenue=1250,totalExpenses=350,operatingResult=900,revenueByCategory=[dict(type='rental',total=1000)],expensesByCategory=[dict(category='صيانة',total=350)]))
    if path=='/reports/revenue': return wrapped(dict(totalRevenue=1250,chartData=[dict(date='2026-10-10',value=400),dict(date='2026-10-11',value=850)]))
    if path=='/reports/expenses': return wrapped(dict(totalExpenses=350,chartData=[dict(date='2026-10-10',value=100),dict(date='2026-10-11',value=250)],byCategory=[dict(category='صيانة',total=350)]))
    if path.startswith('/reports/'):
        report_rows=rows([dict(id=1,customerName=CUSTOMER['name'],skateCode='SK-002',amount=60,startedAt=NOW,status='active')])
        return wrapped(dict(data=report_rows,meta=dict(total=len(report_rows),page=1,limit=20,totalPages=1)))
    raise KeyError(path)

METRICS = r'''() => {
 const box = el => {const r=el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
 const visible = el => el.getClientRects().length && getComputedStyle(el).visibility!=='hidden';
 const root = document.querySelector('.app-main') || document.body;
 const page = document.querySelector('.page-container') || root;
 const controls=[...root.querySelectorAll('button,input,select,textarea,a')].filter(visible);
 const layouts=[...root.querySelectorAll('div,section,table')].filter(visible).filter(el=>el.scrollWidth>el.clientWidth+3).map(el=>({tag:el.tagName,cls:el.className,overflow:getComputedStyle(el).overflowX,client:el.clientWidth,scroll:el.scrollWidth}));
 return {direction:getComputedStyle(document.body).direction,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,page:box(page),heading:[...root.querySelectorAll('h1')].map(el=>el.textContent),headingBoxes:[...root.querySelectorAll('h1')].map(el=>({text:el.textContent,box:box(el)})),tables:[...root.querySelectorAll('table')].map(el=>({box:box(el),rows:el.rows.length,wrapper:box(el.parentElement),overflow:getComputedStyle(el.parentElement).overflowX})),overflow:layouts,controls:controls.map(el=>({tag:el.tagName,text:(el.getAttribute('aria-label')||el.textContent||el.getAttribute('placeholder')||'').trim().slice(0,80),box:box(el),font:getComputedStyle(el).fontSize})),styles:[page, ...root.querySelectorAll('.page-header,.ds-card,.ds-table,.ds-input,.ds-btn')].filter(visible).slice(0,100).map(el=>({tag:el.tagName,box:box(el),display:getComputedStyle(el).display,gap:getComputedStyle(el).gap,padding:getComputedStyle(el).padding,font:getComputedStyle(el).fontSize,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})),bodyText:root.innerText.slice(0,300)};
}'''

def deep_checks(page, out, base_url):
    checks=[]
    def snap(name):
        page.screenshot(path=str(out/f'deep-{page.viewport_size["width"]}-{name}.png'),full_page=True)
    def record(name, passed, **details): checks.append(dict(name=name,passed=bool(passed),**details))
    def visit(path): page.goto(base_url+path,wait_until='networkidle')
    modal_cases=[('/users','إضافة مستخدم','user-create'),('/roles','إضافة دور','role-create'),('/roles','الصلاحيات','role-permissions'),('/skates','إضافة اسكيت','skate-create'),('/customers','إضافة عميل','customer-create'),('/products','إضافة منتج','product-create'),('/products','فئة جديدة','category-create'),('/reservations','حجز جديد','reservation-create'),('/maintenance','سجل جديد','maintenance-create'),('/rentals/1','إرجاع','rental-return')]
    for width in [1024,1440]:
        page.set_viewport_size(dict(width=width,height=900))
        for route,label,name in modal_cases:
            try:
                visit(route);trigger=page.get_by_role('button',name=label,exact=True).first;trigger.focus();trigger.click()
                dialog=page.get_by_role('dialog').last;dialog.wait_for(state='visible');page.wait_for_timeout(100)
                info=dialog.evaluate("""el=>{const r=el.getBoundingClientRect();return {inside:el.contains(document.activeElement),width:r.width,height:r.height,x:r.x,y:r.y,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}}""")
                record(f'{width}-{name}-bounds',info['x']>=0 and info['y']>=0 and info['width']<=width and info['height']<=900,**info)
                record(f'{width}-{name}-initial-focus',info['inside'])
                # Exercise first/last visible enabled controls, not a fixed Tab count.
                focusables="""el=>[...el.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden')"""
                dialog.evaluate(f"el=>{{const list=({focusables})(el);list.at(-1)?.focus();}}")
                page.keyboard.press('Tab');record(f'{width}-{name}-tab-contained',dialog.evaluate('el=>el.contains(document.activeElement)'))
                dialog.evaluate(f"el=>{{const list=({focusables})(el);list[0]?.focus();}}")
                page.keyboard.press('Shift+Tab');record(f'{width}-{name}-shift-tab-contained',dialog.evaluate('el=>el.contains(document.activeElement)'))
                snap(name);page.keyboard.press('Escape');dialog.wait_for(state='hidden')
                record(f'{width}-{name}-escape',page.get_by_role('dialog').count()==0 or not dialog.is_visible())
                record(f'{width}-{name}-focus-returned',trigger.evaluate('el=>el===document.activeElement'))
            except Exception as exc: record(f'{width}-{name}',False,error=str(exc).splitlines()[0])
        # All eleven report destinations; no export requests or mutations.
        visit('/reports')
        for label in ['نظرة عامة','النتيجة التشغيلية','الإيرادات','الإيجارات','المتأخرات','الأضرار','الصيانة','المصروفات','العملاء','الكاشير','أداء الاسكيتات']:
            try:
                page.get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(160)
                snap('report-'+str(len(checks)));record(f'{width}-report-{label}',page.locator('body').evaluate('el=>el.scrollWidth<=innerWidth'))
            except Exception as exc: record(f'{width}-report-{label}',False,error=str(exc).splitlines()[0])
        # Local POS state and visible payment controls; do not submit.
        try:
            visit('/sales-pos');page.get_by_role('button',name=re.compile('منتج تجريبي 1')).first.click();page.get_by_role('button',name='إضافة دفعة',exact=True).click();snap('sales-cart-payment');record(f'{width}-sales-cart-payment',page.get_by_role('button',name='إتمام البيع',exact=True).is_visible())
        except Exception as exc: record(f'{width}-sales-cart-payment',False,error=str(exc).splitlines()[0])
        try:
            visit('/treasury');page.get_by_role('button',name='إضافة مصروف',exact=True).click();snap('treasury-expense');record(f'{width}-treasury-expense',page.get_by_label('بيان المصروف').is_visible())
        except Exception as exc: record(f'{width}-treasury-expense',False,error=str(exc).splitlines()[0])
        try:
            visit('/rentals/new');page.locator('input').first.fill('عميل');page.wait_for_timeout(450);snap('rental-customer-results');page.get_by_text(CUSTOMER['name'],exact=True).first.click();page.wait_for_timeout(150);snap('rental-skate-picker');record(f'{width}-rental-customer-selection',page.locator('body').evaluate('el=>el.scrollWidth<=innerWidth'))
        except Exception as exc: record(f'{width}-rental-customer-selection',False,error=str(exc).splitlines()[0])
        # Extension remains its existing inline flow, with an explicit cancel path.
        try:
            visit('/rentals/1');page.get_by_role('button',name='تمديد',exact=True).first.click();record(f'{width}-rental-extension-inline',page.get_by_text('مدة التمديد (دقائق)',exact=True).is_visible());snap('rental-extension');page.get_by_role('button',name='إلغاء',exact=True).click()
        except Exception as exc:record(f'{width}-rental-extension-inline',False,error=str(exc).splitlines()[0])
        try:
            visit('/users');bell=page.get_by_role('button',name='الإشعارات',exact=True);bell.focus();page.keyboard.press('Enter');panel=page.locator('#notifications-panel');panel.wait_for(state='visible');snap('notifications');page.keyboard.press('Escape');panel.wait_for(state='hidden');record(f'{width}-notification-escape-focus',bell.evaluate('el=>el===document.activeElement'))
            bell.click();page.locator('h1').click();record(f'{width}-notification-outside-dismiss',not panel.is_visible())
            toggle=page.get_by_role('button',name='تصغير القائمة',exact=True);toggle.click();expand=page.get_by_role('button',name='توسيع القائمة',exact=True);expand.wait_for(state='visible');expand.focus();record(f'{width}-sidebar-collapsed-toggle',expand.evaluate('el=>{const r=el.getBoundingClientRect();return r.width>=24&&r.x>=0&&r.right<=innerWidth}'));snap('collapsed-sidebar');page.keyboard.press('Enter');record(f'{width}-sidebar-expand',page.get_by_role('button',name='تصغير القائمة',exact=True).is_visible())
        except Exception as exc:record(f'{width}-navigation-keyboard',False,error=str(exc).splitlines()[0])
        print(f'Deep interactions finished: {width}',flush=True)
    # Short desktop viewport: whole cart and long modal must keep actions reachable.
    page.set_viewport_size(dict(width=1024,height=600))
    try:
        visit('/sales-pos')
        for i in range(1,5):page.get_by_role('button',name=re.compile('منتج تجريبي '+str(i))).first.click()
        for _ in range(3):
            page.get_by_role('button',name='إضافة دفعة',exact=True).click();page.locator('.sales-pos-payment-row input').last.fill('1')
        checkout=page.get_by_role('button',name='إتمام البيع',exact=True);checkout.scroll_into_view_if_needed();snap('short-cart-checkout');record('1024x600-cart-checkout-reachable',checkout.evaluate('el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}'))
        visit('/rentals/1');page.get_by_role('button',name='إرجاع',exact=True).click();dialog=page.get_by_role('dialog');dialog.wait_for(state='visible');submit=page.get_by_role('button',name='تأكيد الإعادة',exact=True);submit.scroll_into_view_if_needed();snap('short-return-dialog');record('1024x600-return-actions-reachable',submit.evaluate('el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}'));page.keyboard.press('Escape');dialog.wait_for(state='hidden')
    except Exception as exc:record('1024x600-short-desktop',False,error=str(exc))
    try:
        visit('/rentals/1?auditScenario=returned');page.get_by_role('button',name='إتمام الإيجار وتحصيل الدفع',exact=True).click();dialog=page.get_by_role('dialog');dialog.wait_for(state='visible');page.wait_for_timeout(160)
        for _ in range(3):page.get_by_role('button',name='تقسيم',exact=True).click()
        snap('short-finalize-dialog');record('1024x600-finalize-dialog-contained',dialog.evaluate('el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}'));page.keyboard.press('Escape');dialog.wait_for(state='hidden')
    except Exception as exc:record('1024x600-finalize',False,error=str(exc))
    return checks

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--label',default='baseline');ap.add_argument('--url',default='http://127.0.0.1:5173');ap.add_argument('--widths',default='1024,1440,375,767,1023');ap.add_argument('--routes',default='');ap.add_argument('--empty',action='store_true');ap.add_argument('--error',action='store_true');ap.add_argument('--restricted',action='store_true');ap.add_argument('--deep',action='store_true');ap.add_argument('--deep-only',action='store_true');ap.add_argument('--height',type=int,default=900);args=ap.parse_args()
    out=ROOT/'tests/desktop-artifacts'/args.label;out.mkdir(parents=True,exist_ok=True)
    results=[];unhandled=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,channel='chrome')
        context=browser.new_context(viewport={'width':1440,'height':900},locale='ar-EG',timezone_id='Africa/Cairo',reduced_motion='reduce')
        context.add_init_script("""const NativeDate=Date; class FixedDate extends NativeDate { constructor(...args){super(...(args.length?args:['2026-10-11T12:00:00.000Z']));} static now(){return 1791720000000;} } window.Date=FixedDate;""")
        def intercept(route):
            req=route.request;url=urlparse(req.url);path=url.path.removeprefix('/api/v1')
            if req.method=='OPTIONS': route.fulfill(status=204,headers={'Access-Control-Allow-Origin':args.url,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,authorization','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE'});return
            if req.method!='GET' and path!='/auth/refresh':
                unhandled.append({'method':req.method,'path':path,'blockedWrite':True});route.fulfill(status=405,json={'message':'Isolated UI audit: writes disabled'});return
            try:
                data=fixture(path,parse_qs(url.query),args.empty);status=200
                if args.error and path not in ['/auth/refresh','/auth/me','/settings','/notifications']:
                    data={'error':{'message':'تعذر تحميل البيانات التجريبية. يرجى المحاولة مجدداً.'}};status=500
                if path=='/rentals/1' and 'auditScenario=returned' in req.frame.url:
                    returned=dict(ITEM,status='returned',returnedAt=NOW,actualDurationMinutes=60,actualAmount=60)
                    data=wrapped(dict(RENTAL,items=[returned]))
                if args.restricted and path=='/auth/me': data=wrapped({'user':dict(USER,permissions=[])})
            except KeyError: unhandled.append({'method':req.method,'path':path});data={'message':'Missing synthetic fixture'};status=501
            route.fulfill(status=status,json=data,headers={'Access-Control-Allow-Origin':args.url,'Access-Control-Allow-Credentials':'true'})
        context.route('**/api/v1/**',intercept)
        page=context.new_page();page.set_default_timeout(4000); errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        for width in ([] if args.deep_only else map(int,args.widths.split(','))):
            page.set_viewport_size({'width':width,'height':args.height})
            for path in args.routes.split(',') if args.routes else ROUTES:
                errors.clear();page.goto(args.url+path,wait_until='networkidle');page.wait_for_timeout(120)
                name=(path.strip('/').replace('/','-') or 'dashboard')
                result=dict(route=path,width=width,metrics=page.evaluate(METRICS),errors=list(errors))
                page.screenshot(path=str(out/f'{width}-{name}.png'),full_page=True)
                results.append(result)
                print(f'{width} {path} doc={result["metrics"]["documentWidth"]} errors={len(errors)}',flush=True)
        deep=deep_checks(page,out,args.url) if args.deep else []
        if args.deep: deep.append(dict(name='deep-runtime-errors',passed=not errors,errors=list(errors)))
        browser.close()
    (out/'results.json').write_text(json.dumps(dict(label=args.label,synthetic=True,results=results,unhandled=unhandled,deep=deep),ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Evidence: {out}; cases={len(results)}; unhandled={unhandled}; deep failures={sum(not c["passed"] for c in deep)}',flush=True)
if __name__=='__main__':main()
