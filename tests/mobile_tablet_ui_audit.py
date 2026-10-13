"""Synthetic RTL phone/tablet audit. Reuses the desktop fixture contract.
No API/database is contacted: all /api/v1 requests are fulfilled locally and
non-auth writes are rejected. Requires installed Python Playwright/Pillow/Chrome.
Start Vite, then run --label mobile-tablet-final --deep. Use --compare with a
baseline label to enforce unchanged desktop geometry/styles/content. Capture both
labels with this harness version: legacy combined visible/ARIA text is insufficient.
Use --motion no-preference and --touch for normal-motion/touch coverage.
"""
from __future__ import annotations
import argparse
import json
import re
from urllib.parse import urlparse, parse_qs
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright
from desktop_ui_audit import ROOT, ROUTES, METRICS, fixture, wrapped, USER, CUSTOMER, RENTAL, ITEM, NOW

ARTIFACTS = ROOT/'tests/desktop-artifacts'
SIZES = '375x812,390x844,430x932,640x960,767x1024,768x1024,820x1180,1023x768,667x375,1024x900,1440x900'
DEEP_SIZES = '375x812,768x1024,1023x768,667x375'
FIXED_DATE = "const NativeDate=Date; class FixedDate extends NativeDate {constructor(...args){super(...(args.length?args:['2026-10-11T12:00:00.000Z']));}static now(){return 1791720000000;}} window.Date=FixedDate;"
FOCUSABLES = """el=>[...el.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden')"""
# Keep visible content independent of accessible naming. The desktop metric's
# legacy 'text' field chooses aria-label first and truncates at 80 characters.
AUDIT_METRICS = r'''() => {
 const metrics=(''' + METRICS + r''')();
 const root=document.querySelector('.app-main')||document.body;
 const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
 const controls=[...root.querySelectorAll('button,input,select,textarea,a')].filter(visible);
 metrics.controlContentVersion=1;
 metrics.fullBodyText=root.innerText;
 metrics.controls=controls.map((el,index)=>{
   const {text,...geometry}=metrics.controls[index];
   const labelledBy=el.getAttribute('aria-labelledby');
   return {...geometry,
     visibleText:(el.innerText??el.textContent??'').trim(),
     placeholder:el.getAttribute('placeholder'),
     value:['INPUT','SELECT','TEXTAREA'].includes(el.tagName)?el.value:null,
     ariaLabel:el.getAttribute('aria-label'),
     ariaLabelledBy:labelledBy,
     ariaLabelledText:labelledBy?labelledBy.split(/\s+/).map(id=>document.getElementById(id)?.textContent??'').join(' '):null};
 });
 return metrics;
}'''
RESPONSIVE = r'''() => {
 const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
 const box=el=>{const r=el.getBoundingClientRect();const n=x=>Math.round(x*100)/100;return {x:n(r.x),y:n(r.y),w:n(r.width),h:n(r.height)}};
 const name=el=>(el.getAttribute('aria-label')||el.innerText||el.getAttribute('placeholder')||el.getAttribute('title')||el.name||'').trim().slice(0,90);
 const controls=[...document.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href]')].filter(visible);
 const target=el=>['checkbox','radio'].includes(el.type)?el.closest('label')||(el.id&&document.querySelector('label[for="'+CSS.escape(el.id)+'"]'))||el:el;
 return {rtl:document.documentElement.dir==='rtl'&&getComputedStyle(document.body).direction==='rtl',lang:document.documentElement.lang,viewport:document.querySelector('meta[name="viewport"]')?.content,
 smallTargets:controls.map(el=>({tag:el.tagName,type:el.type,name:name(el),cls:el.className,box:box(target(el))})).filter(x=>x.box.w<44||x.box.h<44),
 smallInputs:controls.filter(el=>['INPUT','SELECT','TEXTAREA'].includes(el.tagName)&&!['checkbox','radio'].includes(el.type)&&parseFloat(getComputedStyle(el).fontSize)<16).map(el=>({name:name(el),font:getComputedStyle(el).fontSize,box:box(el)})),
 narrowText:[...document.querySelectorAll('h1,h2,h3,p,span')].filter(el=>visible(el)&&getComputedStyle(el).opacity!=='0'&&!el.children.length&&el.textContent.trim().length>8).filter(el=>{const b=box(el),f=parseFloat(getComputedStyle(el).fontSize);return b.w>0&&b.w<f*3&&b.h>f*5}).map(el=>({text:el.textContent.trim(),box:box(el)})),
 topbarTitle:[...document.querySelectorAll('.topbar-title')].filter(visible).map(el=>el.innerText)};
}'''

# There are deliberately no blanket target or input-font exemptions. A native
# checkbox/radio is measured using its associated clickable label in RESPONSIVE.
def mobile_control_failures(responsive, width):
    if width >= 1024:
        return {}
    return {name: responsive[name] for name in ('smallTargets', 'smallInputs', 'narrowText')
            if responsive.get(name)}


def route_failure(result):
    metrics=result['metrics']; responsive=result['responsive']
    details=mobile_control_failures(responsive,result['width'])
    if metrics['documentWidth']>result['width']:
        details['documentWidth']=metrics['documentWidth']
    if result['errors']:
        details['errors']=result['errors']
    if not responsive['rtl']:
        details['rtl']=False
    return dict(route=result['route'],width=result['width'],height=result['height'],**details) if details else None


def sizes(value): return [dict(zip(('width','height'),map(int,s.split('x')))) for s in value.split(',')]
def route_name(route): return route.strip('/').replace('/','-') or 'dashboard'
def contained(locator): return locator.evaluate('el=>{const r=el.getBoundingClientRect();return r.x>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1}')

def deep_checks(page,out,url,viewports,only_dialog=None):
    checks=[];prefix=''
    def record(name,passed,**details): checks.append(dict(name=prefix+'-'+name,passed=bool(passed),**details))
    def visit(path): page.goto(url+path,wait_until='networkidle')
    def snap(name):
        if page.viewport_size['width']<1024:
            responsive=page.evaluate(RESPONSIVE)
            issues=mobile_control_failures(responsive,page.viewport_size['width'])
            record(name+'-touch-and-inputs',not issues,**issues)
        page.screenshot(path=str(out/f'deep-{prefix}-{name}.png'),full_page=False)
    def focus_checks(dialog,name):
        record(name+'-initial-focus',dialog.evaluate('el=>el.contains(document.activeElement)'))
        dialog.evaluate(f'el=>{{const list=({FOCUSABLES})(el);list.at(-1)?.focus();}}');page.keyboard.press('Tab')
        record(name+'-tab-contained',dialog.evaluate('el=>el.contains(document.activeElement)'))
        dialog.evaluate(f'el=>{{const list=({FOCUSABLES})(el);list[0]?.focus();}}');page.keyboard.press('Shift+Tab')
        record(name+'-shift-tab-contained',dialog.evaluate('el=>el.contains(document.activeElement)'))
    modal_cases=[('/users','إضافة مستخدم','user-create'),('/roles','إضافة دور','role-create'),('/roles','الصلاحيات','role-permissions'),('/skates','إضافة اسكيت','skate-create'),('/customers','إضافة عميل','customer-create'),('/products','إضافة منتج','product-create'),('/products','فئة جديدة','category-create'),('/reservations','حجز جديد','reservation-create'),('/maintenance','سجل جديد','maintenance-create'),('/rentals/1','إرجاع','rental-return')]
    modal_cases.append(('/sales','التفاصيل','sale-details'))
    modal_cases.extend([('/sales','إلغاء الفاتورة','sale-cancel'),('/reservations','إلغاء','reservation-cancel')])
    if only_dialog: modal_cases=[case for case in modal_cases if case[2]==only_dialog]
    labels=['نظرة عامة','النتيجة التشغيلية','الإيرادات','الإيجارات','المتأخرات','الأضرار','الصيانة','المصروفات','العملاء','الكاشير','أداء الاسكيتات']
    for size in viewports:
        page.set_viewport_size(size);prefix=f'{size["width"]}x{size["height"]}'
        for route,label,name in modal_cases:
            try:
                visit(route);trigger=page.get_by_role('button',name=label,exact=True).first;trigger.focus();trigger.click()
                dialog=page.get_by_role('dialog').last;dialog.wait_for(state='visible');page.wait_for_timeout(350)
                info=dialog.evaluate('el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}}')
                record(name+'-bounds',contained(dialog) and info['scrollWidth']<=info['clientWidth']+1,**info)
                control_issues=mobile_control_failures(page.evaluate(RESPONSIVE),size['width'])
                record(name+'-touch-controls',not control_issues,issues=control_issues)
                focus_checks(dialog,name);actions=dialog.locator('button:visible');actions.last.scroll_into_view_if_needed()
                record(name+'-last-action-reachable',contained(actions.last));snap(name)
                page.keyboard.press('Escape');dialog.wait_for(state='hidden');record(name+'-escape',not dialog.is_visible())
                record(name+'-focus-returned',trigger.evaluate('el=>el===document.activeElement'))
                if name in ['sale-cancel','reservation-cancel']:
                    trigger.click();dialog=page.get_by_role('dialog').last;dialog.wait_for(state='visible')
                    dialog.get_by_role('button',name='تراجع',exact=True).click();dialog.wait_for(state='hidden')
                    record(name+'-cancel-focus',trigger.evaluate('el=>el===document.activeElement'))
            except Exception as exc:record(name,False,error=str(exc).splitlines()[0])
        if only_dialog:
            print('Dialog interactions finished: '+prefix,flush=True)
            continue
        try:
            visit('/users')
            if size['width']<768:
                trigger=page.get_by_role('button',name='فتح القائمة',exact=True);trigger.focus();trigger.click()
                drawer=page.locator('.sidebar-mobile-drawer');drawer.wait_for(state='visible');page.wait_for_timeout(350)
                record('drawer-bounds',contained(drawer));record('drawer-expanded-state',trigger.get_attribute('aria-expanded')=='true');focus_checks(drawer,'drawer');snap('drawer')
                page.keyboard.press('Escape');drawer.wait_for(state='hidden');record('drawer-escape-focus',trigger.evaluate('el=>el===document.activeElement'))
                trigger.click();drawer.wait_for(state='visible');drawer.get_by_role('link',name='المنتجات',exact=True).click()
                page.wait_for_url('**/products');drawer.wait_for(state='hidden');record('drawer-route-close','/products' in page.url and not drawer.is_visible())
                trigger.click();drawer.wait_for(state='visible');page.set_viewport_size(dict(width=820,height=size['height']));drawer.wait_for(state='hidden')
                record('drawer-resize-unlocks-scroll',page.locator('body').evaluate('el=>getComputedStyle(el).overflow!=="hidden"'));page.set_viewport_size(size)
            else:
                toggle=page.get_by_role('button',name='تصغير القائمة',exact=True);toggle.click();expand=page.get_by_role('button',name='توسيع القائمة',exact=True);expand.wait_for(state='visible')
                record('tablet-collapse-control-visible',contained(expand));snap('tablet-collapsed-sidebar');expand.click();record('tablet-expand-control-visible',contained(toggle))
        except Exception as exc:record('navigation',False,error=str(exc).splitlines()[0])
        try:
            visit('/users');bell=page.get_by_role('button',name='الإشعارات',exact=True);bell.focus();bell.click();panel=page.locator('#notifications-panel');panel.wait_for(state='visible')
            record('notifications-bounds',contained(panel));snap('notifications');page.keyboard.press('Escape');panel.wait_for(state='hidden');record('notifications-escape-focus',bell.evaluate('el=>el===document.activeElement'))
            bell.click();page.locator('.topbar-title:visible').first.click();record('notifications-outside-dismiss',not panel.is_visible())
        except Exception as exc:record('notifications',False,error=str(exc).splitlines()[0])
        visit('/reports')
        for index,label in enumerate(labels):
            try:
                page.get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(350)
                record('report-'+str(index),page.evaluate('document.documentElement.scrollWidth<=innerWidth'),label=label);snap('report-'+str(index))
            except Exception as exc:record('report-'+str(index),False,error=str(exc).splitlines()[0],label=label)
        try:
            visit('/sales-pos')
            for i in range(1,5):page.get_by_role('button',name=re.compile('منتج تجريبي '+str(i))).first.click()
            for _ in range(3):page.get_by_role('button',name='إضافة دفعة',exact=True).click();page.locator('.sales-pos-payment-row input').last.fill('1')
            checkout=page.get_by_role('button',name='إتمام البيع',exact=True);checkout.scroll_into_view_if_needed()
            record('cart-checkout-reachable',contained(checkout));record('cart-contained',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));snap('cart-payment')
        except Exception as exc:record('cart-payment',False,error=str(exc).splitlines()[0])
        try:
            visit('/rentals/new');page.locator('input').first.fill('عميل');page.wait_for_timeout(450);page.get_by_text(CUSTOMER['name'],exact=True).first.click();page.wait_for_timeout(350)
            record('rental-customer-selection',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));snap('rental-skate-picker')
        except Exception as exc:record('rental-customer-selection',False,error=str(exc).splitlines()[0])
        try:
            visit('/treasury');page.get_by_role('button',name='إضافة مصروف',exact=True).click();field=page.get_by_label('بيان المصروف');field.scroll_into_view_if_needed()
            record('treasury-expense-field',contained(field));record('treasury-expense-contained',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));snap('treasury-expense')
        except Exception as exc:record('treasury-expense',False,error=str(exc).splitlines()[0])
        try:
            visit('/rentals/1?auditScenario=returned');page.get_by_role('button',name='إتمام الإيجار وتحصيل الدفع',exact=True).click();dialog=page.get_by_role('dialog');dialog.wait_for(state='visible')
            for _ in range(3):page.get_by_role('button',name='تقسيم',exact=True).click()
            record('finalize-dialog-contained',contained(dialog));snap('finalize-payment');page.keyboard.press('Escape');dialog.wait_for(state='hidden')
        except Exception as exc:record('finalize-payment',False,error=str(exc).splitlines()[0])
        try:
            visit('/sales');origin=page.get_by_role('button',name='التفاصيل',exact=True).first;origin.click()
            first=page.get_by_role('dialog').first;first.wait_for(state='visible')
            nested_trigger=first.get_by_role('button',name='إلغاء الفاتورة واسترجاع المخزون',exact=True);nested_trigger.click()
            second=page.get_by_role('dialog',name='إلغاء الفاتورة',exact=True);second.wait_for(state='visible');focus_checks(second,'nested-sale-cancel')
            record('nested-sale-cancel-bounds',contained(second));snap('nested-sale-cancel');page.keyboard.press('Escape');second.wait_for(state='hidden')
            record('nested-sale-preserves-parent',first.is_visible() and page.locator('body').evaluate('el=>getComputedStyle(el).overflow==="hidden"'))
            record('nested-sale-restores-parent-focus',nested_trigger.evaluate('el=>el===document.activeElement'))
            page.keyboard.press('Escape');first.wait_for(state='hidden');record('nested-sale-restores-trigger',origin.evaluate('el=>el===document.activeElement'))
        except Exception as exc:record('nested-sale-cancel',False,error=str(exc).splitlines()[0])
        try:
            visit('/reports');export=page.get_by_role('button',name='Excel',exact=True);export.click();toast=page.locator('.toast-item').last;toast.wait_for(state='visible')
            record('report-unavailable-export-toast',contained(toast) and page.locator('.toast-container').get_attribute('aria-live')=='polite')
            record('report-toast-keeps-focus',export.evaluate('el=>el===document.activeElement'));snap('report-export-info');toast.locator('.toast-dismiss').click();toast.wait_for(state='hidden')
            page.get_by_role('button',name='الإيجارات',exact=True).click();export.click();toast=page.locator('.toast-item').last;toast.wait_for(state='visible')
            record('report-export-error-toast',contained(toast));record('report-export-reenabled',export.is_enabled());snap('report-export-error');toast.locator('.toast-dismiss').click();toast.wait_for(state='hidden')
        except Exception as exc:record('report-export-feedback',False,error=str(exc).splitlines()[0])
        print('Deep interactions finished: '+prefix,flush=True)
    return checks

def desktop_index(results, source):
    indexed={};issues=[];count=0
    for row in results:
        if row.get('width',0)<1024:
            continue
        count+=1
        if not all(key in row for key in ('width','height','route')):
            issues.append(dict(kind='missingCaseKey',source=source,row=row.get('route'),width=row.get('width')))
            continue
        key=(row['width'],row['height'],row['route'])
        if key in indexed:
            issues.append(dict(kind='duplicateCase',source=source,width=key[0],height=key[1],route=key[2]))
        else:
            indexed[key]=row
    return indexed,issues,count


def compare(before_label,current_label):
    before=json.loads((ARTIFACTS/before_label/'results.json').read_text(encoding='utf-8'))
    after=json.loads((ARTIFACTS/current_label/'results.json').read_text(encoding='utf-8'))
    old,old_issues,old_count=desktop_index(before['results'],'baseline')
    new,new_issues,new_count=desktop_index(after['results'],'current')
    coverage_failures=old_issues+new_issues
    for kind,keys in [('missingFromCurrent',old.keys()-new.keys()),('missingFromBaseline',new.keys()-old.keys())]:
        coverage_failures.extend(dict(kind=kind,width=w,height=h,route=route) for w,h,route in sorted(keys))
    if not old or not new:
        coverage_failures.append(dict(kind='emptyDesktopCoverage',baselineCases=old_count,currentCases=new_count))
    comparisons=[];evidence_failures=[]
    stable=['direction','viewport','documentWidth','page','heading','headingBoxes','tables','styles','bodyText']
    aria_fields={'ariaLabel','ariaLabelledBy','ariaLabelledText'}
    content_fields={'visibleText','placeholder','value'}|aria_fields
    for key in sorted(old.keys() & new.keys()):
        previous=old[key];current=new[key];a_metrics=previous['metrics'];b_metrics=current['metrics']
        changed=[field for field in stable if field not in a_metrics or field not in b_metrics or a_metrics[field]!=b_metrics[field]]
        label_changes=[]
        old_controls=a_metrics.get('controls',[]);new_controls=b_metrics.get('controls',[])
        valid_content=all(metrics.get('controlContentVersion')==1 and 'controls' in metrics
                          and all(content_fields<=control.keys() for control in metrics['controls'])
                          for metrics in (a_metrics,b_metrics))
        if not valid_content:
            changed.append('controlContentEvidence')
            evidence_failures.append(dict(kind='missingSeparateControlContent',width=key[0],height=key[1],route=key[2],
                                          detail='Recapture both labels using this harness; combined ARIA/visible text cannot prove preservation.'))
        else:
            visible_controls=lambda controls:[{field:value for field,value in control.items() if field not in aria_fields} for control in controls]
            if visible_controls(old_controls)!=visible_controls(new_controls):
                changed.append('controls')
            if len(old_controls)==len(new_controls):
                for index,(a_control,b_control) in enumerate(zip(old_controls,new_controls)):
                    a_labels={field:a_control[field] for field in sorted(aria_fields)}
                    b_labels={field:b_control[field] for field in sorted(aria_fields)}
                    if a_labels!=b_labels:
                        label_changes.append(dict(index=index,before=a_labels,after=b_labels))
        name=f'{key[0]}x{key[1]}-{route_name(key[2])}.png'
        pixel_error=None;bounds=None;pixels_identical=False
        try:
            with Image.open(ARTIFACTS/before_label/previous.get('screenshot',name)) as source:
                a=source.convert('RGB')
            with Image.open(ARTIFACTS/current_label/current.get('screenshot',name)) as source:
                b=source.convert('RGB')
            if a.size!=b.size:
                bounds='size-mismatch'
            else:
                diff=ImageChops.difference(a,b);bounds=diff.getbbox();pixels_identical=bounds is None
                if bounds:
                    diff.save(ARTIFACTS/current_label/('desktop-diff-'+name))
        except OSError as exc:
            pixel_error=str(exc)
            evidence_failures.append(dict(kind='screenshotUnavailable',width=key[0],height=key[1],route=key[2],error=pixel_error))
        comparisons.append(dict(width=key[0],height=key[1],route=key[2],layoutIdentical=not changed,changed=changed,
                                pixelsIdentical=pixels_identical,pixelDifferenceBounds=bounds,pixelComparisonError=pixel_error,
                                accessibleLabelChanges=label_changes))
    layout_failures=[case for case in comparisons if not case['layoutIdentical']]
    report=dict(cases=len(comparisons),baselineDesktopCases=old_count,currentDesktopCases=new_count,
                coverageIdentical=not coverage_failures,coverageFailures=coverage_failures,evidenceFailures=evidence_failures,
                accessibleLabelChangeCases=sum(bool(case['accessibleLabelChanges']) for case in comparisons),
                layoutIdentical=sum(case['layoutIdentical'] for case in comparisons),
                pixelsIdentical=sum(case['pixelsIdentical'] for case in comparisons),
                failures=coverage_failures+evidence_failures+layout_failures,comparisons=comparisons)
    (ARTIFACTS/current_label/'desktop-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='comparisons'},ensure_ascii=True,indent=2))
    return report


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--label',default='mobile-tablet-final');ap.add_argument('--url',default='http://127.0.0.1:5173');ap.add_argument('--viewports',default=SIZES);ap.add_argument('--routes',default='')
    ap.add_argument('--deep',action='store_true');ap.add_argument('--deep-only',action='store_true');ap.add_argument('--deep-viewports',default=DEEP_SIZES)
    ap.add_argument('--empty',action='store_true');ap.add_argument('--error',action='store_true');ap.add_argument('--restricted',action='store_true');ap.add_argument('--large-text',action='store_true');ap.add_argument('--dialog');ap.add_argument('--compare')
    ap.add_argument('--motion',choices=['reduce','no-preference'],default='reduce');ap.add_argument('--touch',action='store_true');args=ap.parse_args()
    if args.compare:
        report=compare(args.compare,args.label);raise SystemExit(1 if report['failures'] or not report['cases'] else 0)
    out=ARTIFACTS/args.label;out.mkdir(parents=True,exist_ok=True);results=[];unhandled=[];errors=[];failures=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,channel='chrome');context=browser.new_context(viewport=dict(width=1440,height=900),locale='ar-EG',timezone_id='Africa/Cairo',reduced_motion=args.motion,has_touch=args.touch);context.add_init_script(FIXED_DATE)
        def intercept(route):
            req=route.request;url=urlparse(req.url);path=url.path.removeprefix('/api/v1');headers={'Access-Control-Allow-Origin':args.url,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,authorization','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE'}
            if req.method=='OPTIONS':route.fulfill(status=204,headers=headers);return
            if req.method!='GET' and path!='/auth/refresh':
                unhandled.append(dict(method=req.method,path=path,blockedWrite=True));route.fulfill(status=405,json={'message':'Isolated UI audit: writes disabled'},headers=headers);return
            try:
                data=fixture(path,parse_qs(url.query),args.empty);status=200
                if args.error and path not in ['/auth/refresh','/auth/me','/settings','/notifications']:data={'error':{'message':'تعذر تحميل البيانات التجريبية. يرجى المحاولة مجدداً.'}};status=500
                if path=='/rentals/1' and 'auditScenario=returned' in req.frame.url:data=wrapped(dict(RENTAL,items=[dict(ITEM,status='returned',returnedAt=NOW,actualDurationMinutes=60,actualAmount=60)]))
                if path.startswith('/reports/') and parse_qs(url.query).get('limit')==['10000']:data={'error':{'message':'Synthetic export unavailable'}};status=500
                if args.restricted and path=='/auth/me':data=wrapped({'user':dict(USER,permissions=[])})
            except KeyError:unhandled.append(dict(method=req.method,path=path));data={'message':'Missing synthetic fixture'};status=501
            route.fulfill(status=status,json=data,headers=headers)
        context.route('**/api/v1/**',intercept);page=context.new_page();page.set_default_timeout(4000);page.set_default_navigation_timeout(30000);page.on('pageerror',lambda error:errors.append(str(error)))
        for size in ([] if args.deep_only else sizes(args.viewports)):
            page.set_viewport_size(size)
            for route in (args.routes.split(',') if args.routes else ROUTES):
                errors.clear();page.goto(args.url+route,wait_until='networkidle');page.wait_for_timeout(350)
                if args.large_text:page.add_style_tag(content='html { font-size: 200% !important; }')
                filename=f'{size["width"]}x{size["height"]}-{route_name(route)}.png';r=dict(route=route,**size,metrics=page.evaluate(AUDIT_METRICS),responsive=page.evaluate(RESPONSIVE),errors=list(errors),screenshot=filename)
                page.screenshot(path=str(out/filename),full_page=True);results.append(r)
                (out/'route-progress.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
                issue=route_failure(r)
                if issue:failures.append(issue)
                print(f'{size["width"]}x{size["height"]} {route} doc={r["metrics"]["documentWidth"]} smallTargets={len(r["responsive"]["smallTargets"])} smallInputs={len(r["responsive"]["smallInputs"])} errors={len(errors)}',flush=True)
        errors.clear();deep=deep_checks(page,out,args.url,sizes(args.deep_viewports),args.dialog) if args.deep else []
        if args.deep:deep.append(dict(name='runtime-errors',passed=not errors,errors=list(errors)))
        browser.close()
    data=dict(label=args.label,synthetic=True,motion=args.motion,touch=args.touch,results=results,unhandled=unhandled,deep=deep,failures=failures)
    (out/'results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8');summary=dict(routeCases=len(results),routeFailures=failures,unhandled=unhandled,deepChecks=len(deep),deepFailures=[c for c in deep if not c['passed']])
    (out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=True,indent=2),flush=True)
    raise SystemExit(1 if failures or unhandled or summary['deepFailures'] else 0)
if __name__=='__main__':main()



