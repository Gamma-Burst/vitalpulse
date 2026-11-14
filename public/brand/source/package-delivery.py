"""Package only the authorized FolloWeight deliverables, retaining integration paths."""
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[3]
BRAND = ROOT/'public/brand'
doc = ROOT/'docs/codex-billing-architecture.md'
assert doc.is_file() and doc.stat().st_size > 1000, 'Billing architecture missing'
(BRAND/'codex-billing-architecture.md').write_bytes(doc.read_bytes())
files = [ROOT/'public/icons'/x for x in ['icon.svg','icon-512.png','icon-192.png']]
files.append(doc)
res = ROOT/'android/app/src/main/res'
for density in ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']:
    files += [res/f'mipmap-{density}'/name for name in
              ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png']]
files += [res/'values/ic_launcher_background.xml',res/'drawable/ic_launcher_monochrome.xml',
          res/'drawable/ic_stat_followeight.xml']
files += [res/'mipmap-anydpi-v33'/n for n in ['ic_launcher.xml','ic_launcher_round.xml']]
files += [f for f in BRAND.rglob('*') if f.is_file() and f.suffix != '.zip'
          and f.name != 'delivery-receipt.json' and '__pycache__' not in f.parts]
inventory = []
for file in sorted(set(files)):
    assert file.is_file(), str(file)
    row = {'path':file.relative_to(ROOT).as_posix(),'bytes':file.stat().st_size,
           'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
    if file.suffix == '.png':
        with Image.open(file) as im:
            row.update(width=im.width,height=im.height,mode=im.mode)
    inventory.append(row)
receipt = {'completed_at_utc':datetime.now(timezone.utc).isoformat(),
           'project':'FolloWeight / followeight.com','files':inventory,
           'checks':'qa/verification.json',
           'runpod':{'pods_started_or_used':[],'stop_receipts_required':False},
           'scope':'Brand assets and billing architecture only; no deployment or paid API calls.',
           'limitations':['No APK build or device test.','Billing architecture is documented, not implemented.'],
           'archive':'public/brand/followeight-delivery.zip'}
receipt_path = BRAND/'delivery-receipt.json'
receipt_path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
files.append(receipt_path)
archive = BRAND/'followeight-delivery.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for file in sorted(set(files)):
        z.write(file,file.relative_to(ROOT).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len(z.namelist()) == len(set(files))
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,
                  'files':len(set(files)),'zip_crc':'PASS',
                  'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}))
