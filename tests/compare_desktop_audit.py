"""Compare isolated audit evidence and enforce unchanged below-desktop layout.
Usage: python tests/compare_desktop_audit.py baseline after
Pixel differences are reported separately from geometry/computed-style differences:
SVG chart animation/render timing can change pixels without changing layout.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parent/'desktop-artifacts'

def main():
    p=argparse.ArgumentParser();p.add_argument('baseline');p.add_argument('current');p.add_argument('--interactions');args=p.parse_args()
    before=json.loads((ROOT/args.baseline/'results.json').read_text(encoding='utf-8'))
    after=json.loads((ROOT/args.current/'results.json').read_text(encoding='utf-8'))
    if args.interactions:after['deep']=json.loads((ROOT/args.interactions/'results.json').read_text(encoding='utf-8')).get('deep',[])
    old={(r['width'],r['route']):r for r in before['results']}
    comparisons=[];failures=[]
    for result in after['results']:
        key=result['width'],result['route'];width,route=key
        if width>=1024:
            if result['errors']:failures.append(dict(width=width,route=route,issue='runtime-errors',details=result['errors']))
            if result['metrics']['documentWidth']>width:failures.append(dict(width=width,route=route,issue='document-overflow'))
        if width>=1024 or key not in old:continue
        old_metrics=old[key]['metrics'];new_metrics=result['metrics']
        # Hook names intentionally differ; existing table overflow class names are not visual properties.
        stable=['direction','viewport','documentWidth','page','heading','tables','controls','styles','bodyText']
        changed=[field for field in stable if old_metrics[field]!=new_metrics[field]]
        name=route.strip('/').replace('/','-') or 'dashboard'
        old_image=Image.open(ROOT/args.baseline/f'{width}-{name}.png').convert('RGB')
        new_image=Image.open(ROOT/args.current/f'{width}-{name}.png').convert('RGB')
        if old_image.size!=new_image.size:pixel_equal=False;pixel_box='size-mismatch'
        else:
            difference=ImageChops.difference(old_image,new_image);pixel_box=difference.getbbox();pixel_equal=pixel_box is None
            if pixel_box:difference.save(ROOT/args.current/f'mobile-diff-{width}-{name}.png')
        comparison=dict(width=width,route=route,layoutIdentical=not changed,changed=changed,pixelsIdentical=pixel_equal,pixelDifferenceBounds=pixel_box)
        comparisons.append(comparison)
        if changed:failures.append(dict(width=width,route=route,issue='below-desktop-layout-changed',fields=changed))
    report=dict(mobileCases=len(comparisons),mobileLayoutIdentical=sum(c['layoutIdentical'] for c in comparisons),mobilePixelsIdentical=sum(c['pixelsIdentical'] for c in comparisons),failures=failures,comparisons=comparisons,unhandled=after.get('unhandled',[]),deepChecks=len(after.get('deep',[])),deepFailures=[c for c in after.get('deep',[]) if not c['passed']])
    (ROOT/args.current/'comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='comparisons'},ensure_ascii=True,indent=2))
    raise SystemExit(1 if failures or report['deepFailures'] or report['unhandled'] else 0)
if __name__=='__main__':main()
