/* FolloWeight identity. Deterministic vector master and supersampled PNG exports.
 * Run from repository root: node public/brand/source/render-brand.cjs
 * Uses the project's installed sharp; no network, paid API or GPU.
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../..');
const brand = path.join(root, 'public/brand');
const res = path.join(root, 'android/app/src/main/res');
const paths = {
  f: 'M128 346V177Q128 158 147 158H274 M128 240H204',
  w: 'M158 240L202 329Q215 355 229 329L263 263Q270 249 277 263L309 329Q323 355 337 328L386 158',
};
const defs = `<defs>
  <linearGradient id="obsidian" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse"><stop stop-color="#070C0B"/><stop offset="1" stop-color="#0F2421"/></linearGradient>
  <linearGradient id="flow" x1="130" y1="352" x2="357" y2="148" gradientUnits="userSpaceOnUse"><stop stop-color="#10B981"/><stop offset=".56" stop-color="#34D399"/><stop offset="1" stop-color="#38BDF8"/></linearGradient>
  <linearGradient id="warm" x1="230" y1="158" x2="294" y2="158" gradientUnits="userSpaceOnUse"><stop stop-color="#FBBF24" stop-opacity="0"/><stop offset=".4" stop-color="#FBBF24" stop-opacity="0"/><stop offset="1" stop-color="#FBBF24" stop-opacity=".9"/></linearGradient>
</defs>`;
const mark = (mono = false) => `<g transform="translate(-1 4)" fill="none" stroke="${mono ? '#FFFFFF' : 'url(#flow)'}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"><path d="${paths.f}"/><path d="${paths.w}"/>${mono ? '' : '<path d="M252 158H274" stroke="url(#warm)"/>'}</g>`;
const svg = (body, d = defs, box = '0 0 512 512') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${d}${body}</svg>`;
const full = svg('<rect width="512" height="512" fill="url(#obsidian)"/>' + mark());
const round = svg('<circle cx="256" cy="256" r="256" fill="url(#obsidian)"/>' + mark());
const legacy = svg('<rect width="512" height="512" rx="112" fill="url(#obsidian)"/>' + mark());
const foreground = svg('<g transform="translate(256 256) scale(.78) translate(-256 -256)">' + mark() + '</g>');
function write(rel, data) { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, data); }
async function png(source, rel, size) {
  const high = await sharp(Buffer.from(source), {density: 288}).resize(size*4,size*4).ensureAlpha().png().toBuffer();
  const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), {recursive:true});
  await sharp(high).resize(size,size,{kernel:'lanczos3'}).ensureAlpha().png({compressionLevel:9}).toFile(p);
}
async function main() {
  write('public/brand/followeight-mark.svg', full + '\n');
  write('public/icons/icon.svg', full + '\n');
  write('public/brand/followeight-monochrome.svg', svg(mark(true), '') + '\n');
  write('public/brand/followeight-foreground.svg', foreground + '\n');
  await png(full, 'public/icons/icon-512.png', 512);
  await png(full, 'public/icons/icon-192.png', 192);
  for (const [density, size, fg] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]) {
    await png(legacy, `android/app/src/main/res/mipmap-${density}/ic_launcher.png`, size);
    await png(round, `android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`, size);
    await png(foreground, `android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`, fg);
  }
  write('android/app/src/main/res/values/ic_launcher_background.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#070C0B</color>\n</resources>\n');
  function vector(scale, dp) { return `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${dp}dp" android:height="${dp}dp" android:viewportWidth="512" android:viewportHeight="512">\n  <group android:pivotX="256" android:pivotY="256" android:scaleX="${scale}" android:scaleY="${scale}">\n    <group android:translateX="-1" android:translateY="4">\n    <path android:strokeColor="#FFFFFFFF" android:strokeWidth="40" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="#00000000" android:pathData="${paths.f}"/>\n    <path android:strokeColor="#FFFFFFFF" android:strokeWidth="40" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="#00000000" android:pathData="${paths.w}"/>\n    </group>\n  </group>\n</vector>\n`; }
  write('android/app/src/main/res/drawable/ic_launcher_monochrome.xml', vector(.78,108));
  write('android/app/src/main/res/drawable/ic_stat_followeight.xml', vector(1.32,24));
  const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>\n</adaptive-icon>\n';
  write('android/app/src/main/res/mipmap-anydpi-v33/ic_launcher.xml', adaptive);
  write('android/app/src/main/res/mipmap-anydpi-v33/ic_launcher_round.xml', adaptive);
  // Studio presentation: a faithful render of the master, with deliberate lighting.
  const showcaseDefs = defs.replace('</defs>', `
  <radialGradient id="studio"><stop stop-color="#163E33"/><stop offset=".55" stop-color="#0B1B17"/><stop offset="1" stop-color="#050A09"/></radialGradient>
  <radialGradient id="halo"><stop stop-color="#34D399" stop-opacity=".15"/><stop offset="1" stop-color="#10B981" stop-opacity="0"/></radialGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#77D3B1" stop-opacity=".4"/><stop offset=".45" stop-color="#1B3D32" stop-opacity=".1"/><stop offset="1" stop-color="#38BDF8" stop-opacity=".24"/></linearGradient>
  <linearGradient id="card" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#10251F"/><stop offset="1" stop-color="#070E0C"/></linearGradient>
  <filter id="shadow" x="-60%" y="-60%" width="220%" height="240%"><feGaussianBlur stdDeviation="24"/></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>`);
  const showcase = svg(`<rect width="1024" height="1024" fill="url(#studio)"/>
  <ellipse cx="512" cy="438" rx="430" ry="400" fill="url(#halo)"/>
  <ellipse cx="512" cy="651" rx="206" ry="34" fill="#000" opacity=".8" filter="url(#shadow)"/>
  <rect x="282" y="193" width="460" height="460" rx="110" fill="#000" opacity=".5" filter="url(#shadow)"/>
  <rect x="280" y="182" width="464" height="464" rx="110" fill="url(#card)" stroke="url(#edge)" stroke-width="1.5"/>
  <path d="M391 182H633" stroke="#8CECCB" stroke-opacity=".13"/>
  <g transform="translate(280 182) scale(.90625)"><g opacity=".23" filter="url(#glow)">${mark()}</g>${mark()}</g>
  <text x="512" y="770" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="74" font-weight="600" letter-spacing="-3.2" fill="#F0F8F3">FolloWeight</text>
  <text x="512" y="825" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="21" letter-spacing="1.5" fill="#8BA99D">FolloWeight · followeight.com</text>
  <path d="M492 887H532" stroke="#34D399" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>`, showcaseDefs, '0 0 1024 1024');
  write('public/brand/source/followeight-logo-showcase.svg', showcase + '\n');
  await png(showcase, 'public/brand/followeight-logo-showcase.png', 1024);
  // Quality-control contact sheet: genuine small rasters, mask and monochrome checks.
  await png(full, 'public/brand/qa/icon-24.png', 24);
  await png(full, 'public/brand/qa/icon-48.png', 48);
  await png(svg('<g transform="translate(256 256) scale(1.32) translate(-256 -256)">'+mark(true)+'</g>',''), 'public/brand/qa/status-24.png',24);
  const qc = svg(`<rect width="1120" height="680" fill="#0C1210"/>
  <text x="48" y="60" font-family="Segoe UI" font-size="28" fill="#E4F5EC">FolloWeight / contrôles de silhouette</text>
  <svg x="48" y="105" width="300" height="300" viewBox="0 0 512 512">${full.replace(/<svg[^>]*>|<\/svg>/g,'')}</svg>
  <svg x="394" y="105" width="240" height="240" viewBox="0 0 512 512">${round.replace(/<svg[^>]*>|<\/svg>/g,'')}</svg>
  <svg x="720" y="105" width="240" height="240" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#C8E8D9"/><g transform="translate(256 256) scale(.9) translate(-256 -256)" style="color:#0B3021">${mark(true).replaceAll('#FFFFFF','#0B3021')}</g></svg>
  <text x="48" y="450" font-family="Segoe UI" font-size="18" fill="#89A699">Maître web / fond plein</text>
  <text x="394" y="390" font-family="Segoe UI" font-size="18" fill="#89A699">Masque circulaire</text>
  <text x="720" y="390" font-family="Segoe UI" font-size="18" fill="#89A699">Silhouette monochrome</text>
  <text x="48" y="530" font-family="Segoe UI" font-size="18" fill="#89A699">24 px réels</text>
  <text x="270" y="530" font-family="Segoe UI" font-size="18" fill="#89A699">48 px réels</text>
  <text x="500" y="530" font-family="Segoe UI" font-size="18" fill="#89A699">Barre Android / 24 px</text>`, defs, '0 0 1120 680');
  const sheet = await sharp(Buffer.from(qc)).ensureAlpha().png().toBuffer();
  await sharp(sheet).composite([
    {input:path.join(brand,'qa/icon-24.png'),left:48,top:555},
    {input:path.join(brand,'qa/icon-48.png'),left:270,top:555},
    {input:path.join(brand,'qa/status-24.png'),left:500,top:555}
  ]).png().toFile(path.join(brand,'qa/contact-sheet.png'));
  console.log('Rendered FolloWeight web, showcase, Android and QA assets.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
