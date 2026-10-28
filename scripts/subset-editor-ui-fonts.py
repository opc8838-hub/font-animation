import sys, json, re
from pathlib import Path
if len(sys.argv)>1: sys.path.insert(0, sys.argv[1])
from fontTools.ttLib import TTFont, woff2
from fontTools import subset
original_compress=woff2.brotli.compress
def compress(data, **options):
    options['quality']=6
    return original_compress(data, **options)
woff2.brotli.compress=compress
site=Path(__file__).resolve().parents[1]/'site'
chars=set(range(0x20,0x300))
for file in site.glob('*.html'):
    chars.update(ord(c) for c in file.read_text(encoding='utf8'))
for name in ['shared-font-library.js','stg-cn.js','row-font-editor.js','me-motion-editor.js','morphports-reviewed.js','typecascade-workspace.js','typecascade-polish.js','typecascade-selects.js','typecascade-locale.js']:
    file=site/name
    if file.exists(): chars.update(ord(c) for c in file.read_text(encoding='utf8'))
def ranges(values):
    result=[]
    for n in sorted(values):
        if result and n==result[-1][1]+1: result[-1][1]=n
        else: result.append([n,n])
    return ','.join('U+%X'%a if a==b else 'U+%X-%X'%(a,b) for a,b in result)
font_map={}
for src,name,family,weight in [('assets/NotoSansSC-Regular.ttf','NotoSansSC-Regular','STG Noto Sans SC',400),('assets/NotoSansJP-Thin.otf','NotoSansJP-Thin','STG Noto Sans JP',200),('assets/NotoSansSC-Black.ttf','NotoSansSC-Black','STG Noto Sans SC',900)]:
    original=TTFont(site/src,recalcTimestamp=False)
    cmap=original.getBestCmap(); requested=chars.intersection(cmap)
    face=TTFont(site/src,recalcTimestamp=False)
    options=subset.Options(); options.recalc_timestamp=False
    sub=subset.Subsetter(options=options); sub.populate(unicodes=requested); sub.subset(face)
    face.flavor='woff2'; dest=site/'assets/fonts'/f'{name}-ui.woff2'; face.save(dest)
    check=TTFont(dest); actual=check.getBestCmap()
    assert requested.issubset(actual)
    for char in requested:
        assert original['hmtx'].metrics[cmap[char]]==check['hmtx'].metrics[actual[char]]
    full_path='assets/fonts/'+name+'.woff2' if name!='NotoSansSC-Black' else src
    font_map[src]={'preview':'assets/fonts/'+name+'-ui.woff2','full':full_path,'previewRange':ranges(set(actual)),'fullRange':ranges(set(cmap)-set(actual))}
    print(name,len(actual),dest.stat().st_size,flush=True)

(site/'assets/fonts/editor-font-map.json').write_text(json.dumps(font_map,ensure_ascii=False)+'\n',encoding='utf8')
