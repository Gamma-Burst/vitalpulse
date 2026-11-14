"""Validate actual PNGs, SVG masters and Android references; no paid services.
Run with C:\\Python314\\python.exe public/brand/source/verify-assets.py
"""
from pathlib import Path
from PIL import Image
import hashlib
import json
import math
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]
BRAND = ROOT / 'public/brand'
expected = {'public/brand/followeight-logo-showcase.png': 1024,
            'public/icons/icon-512.png': 512, 'public/icons/icon-192.png': 192}
for density, size, fg in [('mdpi',48,108),('hdpi',72,162),('xhdpi',96,216),('xxhdpi',144,324),('xxxhdpi',192,432)]:
    for name, dimension in [('ic_launcher',size),('ic_launcher_round',size),('ic_launcher_foreground',fg)]:
        expected[f'android/app/src/main/res/mipmap-{density}/{name}.png'] = dimension

results = []
for relative, size in expected.items():
    file = ROOT / relative
    assert file.is_file(), f'Missing {relative}'
    with Image.open(file) as im:
        im.load()
        assert im.format == 'PNG', relative
        assert im.size == (size,size), (relative, im.size, size)
        assert im.mode == 'RGBA', (relative, im.mode)
        alpha = im.getchannel('A')
        details = {}
        if relative.endswith('_foreground.png'):
            assert alpha.getextrema() == (0,255), f'Foreground transparency: {relative}'
            # All visible pixels (including antialiasing) must fit the guaranteed
            # central 66/108 circle, not just a bounding square.
            rmax = max(math.hypot(x+.5-size/2, y+.5-size/2)
                       for y in range(size) for x in range(size)
                       if alpha.getpixel((x,y)) > 0)
            allowed = size * 33/108
            assert rmax <= allowed, (relative, rmax, allowed)
            details = {'alpha_bbox': list(alpha.getbbox()),
                       'radius_px': round(rmax,3), 'safe_radius_px':round(allowed,3)}
        if relative.endswith('_round.png'):
            assert alpha.getpixel((0,0)) == 0
            assert alpha.getpixel((size//2,size//2)) == 255
        if relative in ('public/icons/icon-512.png','public/icons/icon-192.png'):
            assert alpha.getextrema() == (255,255), 'PWA maskable background must fill canvas'
        results.append({'path':relative,'width':size,'height':size,'mode':im.mode,
                        'sha256':hashlib.sha256(file.read_bytes()).hexdigest(), **details})

master = ROOT / 'public/brand/followeight-mark.svg'
assert master.read_bytes() == (ROOT/'public/icons/icon.svg').read_bytes()
tree = ET.parse(master)
assert tree.getroot().attrib['viewBox'] == '0 0 512 512'
assert not tree.findall('.//{http://www.w3.org/2000/svg}text'), 'No app-icon text'
assert not tree.findall('.//{http://www.w3.org/2000/svg}image'), 'Master must remain native vector'

res = ROOT/'android/app/src/main/res'
background = ET.parse(res/'values/ic_launcher_background.xml')
assert background.find("color[@name='ic_launcher_background']").text == '#070C0B'
android = '{http://schemas.android.com/apk/res/android}'
for folder in ['mipmap-anydpi-v26','mipmap-anydpi-v33']:
    for name in ['ic_launcher.xml','ic_launcher_round.xml']:
        icon = ET.parse(res/folder/name)
        assert icon.find('background').attrib[android+'drawable'] == '@color/ic_launcher_background'
        assert icon.find('foreground').attrib[android+'drawable'] == '@mipmap/ic_launcher_foreground'
        if folder.endswith('v33'):
            assert icon.find('monochrome').attrib[android+'drawable'] == '@drawable/ic_launcher_monochrome'
for name in ['ic_stat_followeight.xml','ic_launcher_monochrome.xml']:
    ET.parse(res/'drawable'/name)

qa_files = []
for name, dimensions in [('icon-24.png',(24,24)),('icon-48.png',(48,48)),
                         ('status-24.png',(24,24)),('contact-sheet.png',(1120,680))]:
    file = BRAND/'qa'/name
    with Image.open(file) as im:
        im.load()
        assert im.format == 'PNG' and im.size == dimensions and im.mode == 'RGBA', name
        qa_files.append({'path':file.relative_to(ROOT).as_posix(), 'width':im.width,
                         'height':im.height, 'mode':im.mode,
                         'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})

report = {'verified_at_utc':datetime.now(timezone.utc).isoformat(),
          'status':'PASS','required_png_count':len(results),
          'total_png_count':len(results)+len(qa_files),'files':results,'qa_files':qa_files,
          'checks':['PNG dimensions and RGBA','SVG 512 viewBox, no text or raster',
                    'master/icon.svg byte equality','transparent adaptive foreground within 66dp circle',
                    'PWA full background','round alpha corners','Android color and resource references'],
          'limits':['No Android device, emulator or APK compilation; XML structure and references validated.',
                    'Notification drawable provided; notification-code wiring is outside this branding task.']}
out = BRAND/'qa/verification.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','required_png_count':len(results),
                  'total_png_count':len(results)+len(qa_files),'report':str(out)},ensure_ascii=False))
