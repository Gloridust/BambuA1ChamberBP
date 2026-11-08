// Builds the timber machining drawings (A4 landscape PDF, Chinese + English).
// Run from the repo root:  node drawings/build.js
// Needs Playwright with Chromium. Output: docs/drawings/*.pdf
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'drawings');
const DATE = '2026-11-08';
let variant = 'pure';  // 'pure' = plain strips (main), 'rebate' = rebate + bead
const nSheets = () => (variant === 'pure' ? 5 : 8);

let lang = 'zh';
const T = (zh, en) => (lang === 'zh' ? zh : en);

/* ---------- geometry (mm) — external feed, rebate + bead version ---------- */
const W = 640, D = 700, P = 600, F = 680;          // frame outer, post length, frame height
const RW = 10, RD = 4;                              // rebate width × depth
const LAP = 8;                                      // panel overlap into rebate (2 mm gap)

/* ---------- svg helpers ---------- */
const f = n => +(+n).toFixed(2);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const R = (x, y, w, h, cls = 'o') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" class="${cls}"/>`;
const Ln = (x1, y1, x2, y2, cls = 't') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${cls}"/>`;
const Poly = (pts, cls) => `<polygon points="${pts.map(p => p.map(f).join(',')).join(' ')}" class="${cls}"/>`;
const Circ = (x, y, r, cls = 'o') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="${cls}"/>`;
function Tx(x, y, s, o = {}) {
  const { size = 2.6, a = 'start', w = 400, cls = '', rot = 0 } = o;
  const tr = rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : '';
  return `<text x="${f(x)}" y="${f(y)}" font-size="${size}" text-anchor="${a}" font-weight="${w}" class="${cls}"${tr}>${esc(s)}</text>`;
}
function wrap(text, maxW, size) {
  const cw = ch => (/[⺀-￿]/.test(ch) ? size : size * 0.53);
  const tokens = text.match(/[⺀-￿]|[^\s⺀-￿]+\s*|\s+/g) || [];
  const out = []; let line = '', w = 0;
  for (const t of tokens) {
    const tw = [...t].reduce((a, c) => a + cw(c), 0);
    if (w + tw > maxW && line.trim()) { out.push(line.trimEnd()); line = t.trimStart(); w = [...line].reduce((a, c) => a + cw(c), 0); }
    else { line += t; w += tw; }
  }
  if (line.trim()) out.push(line.trimEnd());
  return out;
}
function para(x, y, text, maxW, size = 2.6, lh = 1.55, o = {}) {
  const lines = wrap(text, maxW, size);
  return { svg: lines.map((l, i) => Tx(x, y + i * size * lh, l, { size, ...o })).join(''), h: lines.length * size * lh };
}
// dimensions: arrows on both ends, text above (H) / left (V)
function dimH(x1, x2, y, label, e1, e2, o = {}) {
  let s = '';
  if (e1 != null) s += Ln(x1, e1, x1, y + (y > e1 ? 1.2 : -1.2), 'dim');
  if (e2 != null) s += Ln(x2, e2, x2, y + (y > e2 ? 1.2 : -1.2), 'dim');
  s += `<line x1="${f(x1)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y)}" class="dim" marker-start="url(#ar)" marker-end="url(#ar)"/>`;
  const tx = o.tx != null ? o.tx : (x1 + x2) / 2;
  s += Tx(tx, y - 0.8, label, { size: o.size || 2.3, a: 'middle', cls: 'dt' });
  return s;
}
function dimV(y1, y2, x, label, e1, e2, o = {}) {
  let s = '';
  if (e1 != null) s += Ln(e1, y1, x + (x > e1 ? 1.2 : -1.2), y1, 'dim');
  if (e2 != null) s += Ln(e2, y2, x + (x > e2 ? 1.2 : -1.2), y2, 'dim');
  s += `<line x1="${f(x)}" y1="${f(y1)}" x2="${f(x)}" y2="${f(y2)}" class="dim" marker-start="url(#ar)" marker-end="url(#ar)"/>`;
  const ty = o.ty != null ? o.ty : (y1 + y2) / 2;
  s += Tx(x - 0.8, ty, label, { size: o.size || 2.3, a: 'middle', cls: 'dt', rot: -90 });
  return s;
}
function balloon(x, y, label, tx, ty) {
  return Ln(x, y, tx, ty, 'lead') + Circ(tx, ty, 3.2, 'bal') + Tx(tx, ty + 1.05, label, { size: 2.6, a: 'middle', w: 700 });
}
function leader(x, y, tx, ty, label, a = 'start') {
  return Ln(x, y, tx, ty, 'lead') + Circ(x, y, 0.45, 'dot') + Tx(tx + (a === 'end' ? -1 : 1), ty + 0.9, label, { size: 2.4, a });
}
function table(x, y, cols, rows, o = {}) {
  const rh = o.rh || 6, size = o.size || 2.4;
  const totalW = cols.reduce((a, c) => a + c.w, 0);
  const all = [cols.map(c => c.title), ...rows];
  let s = R(x, y, totalW, rh, 'thead');
  all.forEach((r, i) => {
    const yy = y + i * rh; let cx = x;
    r.forEach((cell, j) => {
      const c = cols[j];
      const tx = c.a === 'middle' ? cx + c.w / 2 : c.a === 'end' ? cx + c.w - 1.2 : cx + 1.2;
      s += Tx(tx, yy + rh * 0.67, cell, { size, a: c.a || 'start', w: i === 0 ? 700 : (j === 0 ? 700 : 400) });
      cx += c.w;
    });
    if (i < all.length - 1) s += Ln(x, yy + rh, x + totalW, yy + rh, i === 0 ? 'o' : 't');
  });
  s += R(x, y, totalW, all.length * rh, 'o');
  let cx = x; cols.slice(0, -1).forEach(c => { cx += c.w; s += Ln(cx, y, cx, y + all.length * rh, 't'); });
  return { svg: s, h: all.length * rh, w: totalW };
}

const DEFS = `<defs>
<marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="2" markerHeight="2" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.8 L10,5 L0,8.2 z" fill="#222"/></marker>
<pattern id="hatch" patternUnits="userSpaceOnUse" width="1.1" height="1.1" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.1" stroke="#c4600a" stroke-width="0.28"/></pattern>
<pattern id="wood" patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform="rotate(-35)"><rect width="2.4" height="2.4" fill="#f6ead6"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#d8bf96" stroke-width="0.18"/></pattern>
</defs>`;
const CSS = `
@page { size: 297mm 210mm; margin: 0 }
* { margin: 0; padding: 0 }
body { font-family: 'Noto Sans SC', 'WenQuanYi Zen Hei', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
section.pg { width: 297mm; height: 210mm; page-break-after: always; overflow: hidden; }
svg { display: block }
text { fill: #111; font-variant-numeric: tabular-nums }
text.dt { fill: #222 } text.mut { fill: #555 } text.acc { fill: #c4600a }
.o { fill: none; stroke: #111; stroke-width: 0.35 }
.of { fill: #fff; stroke: #111; stroke-width: 0.35 }
.wd { fill: url(#wood); stroke: #111; stroke-width: 0.35 }
.wdp { fill: #f6ead6; stroke: #111; stroke-width: 0.3 }
.t { fill: none; stroke: #111; stroke-width: 0.18 }
.hid { fill: none; stroke: #333; stroke-width: 0.18; stroke-dasharray: 1.2 0.8 }
.dim { fill: none; stroke: #222; stroke-width: 0.13 }
.lead { fill: none; stroke: #222; stroke-width: 0.15 }
.dot { fill: #222 }
.bal { fill: #fff; stroke: #111; stroke-width: 0.25 }
.reb { fill: url(#hatch); stroke: #c4600a; stroke-width: 0.2 }
.rebcut { fill: url(#hatch); stroke: #c4600a; stroke-width: 0.2; stroke-dasharray: 0.8 0.5 }
.pan { fill: rgba(80,150,200,0.07); stroke: #2f7fb5; stroke-width: 0.25; stroke-dasharray: 2 0.8 }
.panS { fill: #d9ecf7; stroke: #2f7fb5; stroke-width: 0.25 }
.foam { fill: #444; stroke: none }
.washer { fill: #f4f1e6; stroke: #333; stroke-width: 0.2 }
.bead { fill: #e3c89c; stroke: #111; stroke-width: 0.25 }
.steel { fill: #b9c0c6; stroke: #333; stroke-width: 0.2 }
.thead { fill: #efe7da; stroke: none }
.frame { fill: none; stroke: #111; stroke-width: 0.5 }
.tb { fill: none; stroke: #111; stroke-width: 0.3 }
`;

/* ---------- sheet frame + title block ---------- */
function sheet(n, title, scale, body) {
  const x0 = 186, y0 = 182, x1 = 291, y1 = 204;
  let tb = R(6, 6, 285, 198, 'frame');
  tb += R(x0, y0, x1 - x0, y1 - y0, 'of');
  tb += Ln(x0, y0 + 6.5, x1, y0 + 6.5, 'tb') + Ln(x0, y0 + 15, x1, y0 + 15, 'tb');
  tb += Tx(x0 + 1.5, y0 + 4.5, (variant === 'pure' ? T('拓竹 A1 木框封箱 · 外置供料 · 纯木方版', 'Bambu Lab A1 enclosure · external feed · plain strips') : T('拓竹 A1 木框封箱 · 外置供料 · 裁口压条版（需修边机）', 'Bambu Lab A1 enclosure · external feed · rebate + bead (router needed)')), { size: 2.3, cls: 'mut' });
  tb += Tx(x0 + 1.5, y0 + 12.3, title, { size: 4, w: 700 });
  const cells = [[T('图号', 'Sheet'), `${n} / ${nSheets()}`, 18], [T('比例', 'Scale'), scale, 22], [T('单位', 'Units'), 'mm', 14], [T('日期', 'Date'), DATE, 26], [T('版本', 'Rev.'), 'v2', 25]];
  let cx = x0;
  cells.forEach(([k, v, w], i) => {
    if (i) tb += Ln(cx, y0 + 15, cx, y1, 'tb');
    tb += Tx(cx + 1, y0 + 17.8, k, { size: 1.8, cls: 'mut' }) + Tx(cx + 1, y0 + 21.2, v, { size: 2.6, w: 600 });
    cx += w;
  });
  return `<section class="pg"><svg viewBox="0 0 297 210" width="297mm" height="210mm" xmlns="http://www.w3.org/2000/svg">${DEFS}${body}${tb}</svg></section>`;
}

/* ---------- profiles ---------- */
// a: 0..30 (horizontal), b: 0..40 (vertical up). Left face (a=0) is a 40 face, top face (b=40) is a 30 face.
const PROF = {
  P0: { poly: [[0, 0], [30, 0], [30, 40], [0, 40]], cut: [] },
  PA: { poly: [[0, 0], [30, 0], [30, 40], [4, 40], [4, 30], [0, 30]], cut: [[0, 4, 30, 40]] },
  PB: { poly: [[0, 0], [30, 0], [30, 40], [10, 40], [10, 36], [0, 36]], cut: [[0, 10, 36, 40]] },
  PC: { poly: [[0, 0], [20, 0], [20, 4], [30, 4], [30, 40], [4, 40], [4, 30], [0, 30]], cut: [[0, 4, 30, 40], [20, 30, 0, 4]] }
};
function section(ox, oy, s, key, withDims) {
  const pr = PROF[key];
  let g = Poly(pr.poly.map(([a, b]) => [ox + a * s, oy - b * s]), 'wd');
  pr.cut.forEach(([a0, a1, b0, b1]) => { g += R(ox + a0 * s, oy - b1 * s, (a1 - a0) * s, (b1 - b0) * s, 'rebcut'); });
  if (withDims) {
    g += dimH(ox, ox + 30 * s, oy + 5, '30', oy + 0.5, oy + 0.5);
    g += dimV(oy, oy - 40 * s, ox + 30 * s + 6, '40', ox + 30 * s + 0.5, ox + 30 * s + 0.5);
    if (key === 'PA' || key === 'PC') {
      g += dimV(oy - 30 * s, oy - 40 * s, ox - 4, '10', ox - 0.5, ox - 0.5);
      g += dimH(ox, ox + 4 * s, oy - 40 * s - 4, '4', oy - 40 * s - 0.5, oy - 30 * s - 0.5, { tx: ox + 2 * s });
    }
    if (key === 'PB') {
      g += dimH(ox, ox + 10 * s, oy - 40 * s - 4, '10', oy - 40 * s - 0.5, oy - 36 * s - 0.5);
      g += dimV(oy - 36 * s, oy - 40 * s, ox - 4, '4', ox - 0.5, ox - 0.5, { ty: oy - 38 * s });
    }
    if (key === 'PC') {
      g += dimH(ox + 20 * s, ox + 30 * s, oy + 11, '10', oy + 0.5, oy + 0.5);
      g += dimV(oy, oy - 4 * s, ox + 30 * s + 12, '4', ox + 30 * s + 0.5, ox + 30 * s + 0.5, { ty: oy - 2 * s });
    }
  }
  return g;
}

/* ---------- parts ---------- */
function partsList() {
  return [
    { id: 'A1', name: T('前立柱', 'Front post'), len: P, qty: 2, prof: 'PA', stops: null,
      where: T('前左、前右', 'Front left & right'),
      note: T('40 面朝外（侧面），裁口靠后边。左右两根相同。', '40 face outward (side), rebate on the rear edge. Left and right are the same part.') },
    { id: 'A2', name: T('后立柱', 'Rear post'), len: P, qty: 2, prof: 'PC', stops: null,
      where: T('后左、后右', 'Rear left & right'),
      note: T('40 面朝外（侧面）裁口靠前边；30 面朝后（背面）裁口靠内边。左右相同，调头使用。', '40 face outward (side), rebate on the front edge; 30 face to the back, rebate on the inner edge. Left/right identical, turned end for end.') },
    { id: 'B1', name: T('底框前梁', 'Bottom front rail'), len: W, qty: 1, prof: 'P0', stops: null,
      where: T('底框前侧', 'Bottom frame, front'), note: T('无裁口。', 'No rebate.') },
    { id: 'B2', name: T('底框后梁', 'Bottom back rail'), len: W, qty: 1, prof: 'PA', stops: [20, 620],
      where: T('底框后侧', 'Bottom frame, back'), note: T('40 面朝后，裁口在上沿；止口，两端各留 20。', '40 face to the back, rebate on the top edge; stopped, 20 solid at each end.') },
    { id: 'B3', name: T('顶框前梁', 'Top front rail'), len: W, qty: 1, prof: 'PB', stops: [20, 620],
      where: T('顶框前侧', 'Top frame, front'), note: T('30 面朝上，裁口在内沿（朝后）；止口，两端各留 20。', '30 face up, rebate on the inner (rear) edge; stopped, 20 solid at each end.') },
    { id: 'B4', name: T('顶框后梁', 'Top back rail'), len: W, qty: 1, prof: 'PC', stops: [20, 620],
      where: T('顶框后侧', 'Top frame, back'), note: T('40 面朝后裁口在下沿；30 面朝上裁口在内沿（朝前）。两条都止口，两端各留 20。', '40 face to the back, rebate on the bottom edge; 30 face up, rebate on the inner (front) edge. Both stopped, 20 solid at each end.') },
    { id: 'C1', name: T('底框侧梁', 'Bottom side rail'), len: D - 60, qty: 2, prof: 'PA', stops: null,
      where: T('底框左、右', 'Bottom frame, left & right'), note: T('40 面朝外，裁口在上沿；通长。', '40 face outward, rebate on the top edge; full length.') },
    { id: 'C2', name: T('顶框侧梁', 'Top side rail'), len: D - 60, qty: 2, prof: 'PC', stops: null,
      where: T('顶框左、右', 'Top frame, left & right'), note: T('40 面朝外裁口在下沿；30 面朝上裁口在内沿；通长。', '40 face outward, rebate on the bottom edge; 30 face up, rebate on the inner edge; full length.') },
    { id: 'D', name: T('门框竖梃', 'Door stile'), len: F, qty: 2, prof: 'PA', stops: [30, 650],
      where: T('门左、右', 'Door left & right'), note: T('40 面朝前，裁口在内沿；止口 30–650，两端各留 30。', '40 face to the front, rebate on the inner edge; stopped 30–650, 30 solid at each end.') },
    { id: 'E', name: T('门框横档', 'Door rail'), len: W - 80, qty: 2, prof: 'PA', stops: null,
      where: T('门上、下', 'Door top & bottom'), note: T('40 面朝前，裁口在内沿；通长。', '40 face to the front, rebate on the inner edge; full length.') }
  ];
}
const rebTxt = p => p.prof === 'P0' ? '—' : (p.stops ? T(`止口 ${p.stops[0]}–${p.stops[1]}`, `Stopped ${p.stops[0]}–${p.stops[1]}`) : T('通长', 'Full length')) + (p.prof === 'PC' ? T('（两条）', ' (×2)') : '');

// one part row: bar = view of the rebated face (length 1:sx, cross 1:sy, schematic)
function partRow(x, y, p, o = {}) {
  const sx = o.sx || 0.2, sy = 0.2, barX = o.barX || x + 40;
  const faceW = p.prof === 'PB' ? 30 : 40, bh = faceW * sy, by = y + (o.barDY || 6);
  let s = Tx(x, y + 5.5, p.id, { size: 5, w: 700 });
  s += Tx(x + (p.id.length > 1 ? 11 : 7), y + 4.2, p.name, { size: 2.6, w: 600 });
  s += Tx(x + (p.id.length > 1 ? 11 : 7), y + 7.6, `×${p.qty}  ·  ${p.prof}`, { size: 2.3, cls: 'mut' });
  const L = p.len * sx;
  s += R(barX, by, L, bh, 'wdp');
  if (p.prof !== 'P0') {
    const a = p.stops ? p.stops[0] : 0, b = p.stops ? p.stops[1] : p.len;
    s += R(barX + a * sx, by, (b - a) * sx, RW * sy, 'reb');
    if (p.stops) {
      s += Tx(barX + a * sx / 2, by - 1, String(p.stops[0]), { size: 2, a: 'middle', cls: 'acc' });
      s += Tx(barX + L - (p.len - b) * sx / 2, by - 1, String(p.len - p.stops[1]), { size: 2, a: 'middle', cls: 'acc' });
      s += Ln(barX + a * sx, by - 2.2, barX + a * sx, by, 'dim') + Ln(barX + b * sx, by - 2.2, barX + b * sx, by, 'dim');
    }
    if (p.prof === 'PC') s += Ln(barX, by + bh - RD * sy, barX + L, by + bh - RD * sy, 'hid');
  }
  s += dimH(barX, barX + L, by + bh + 3.2, String(p.len), by + bh + 0.4, by + bh + 0.4);
  // section icon
  const ix = o.iconX || barX + 133;
  s += section(ix, by + 10, 0.36, p.prof, false);
  // note
  const nx = o.noteX || ix + 17;
  s += para(nx, o.noteY != null ? o.noteY : y + 4, p.note, o.noteW || (287 - nx), 2.25, 1.45).svg;
  return s;
}

/* ---------- sheet 1: overview ---------- */
function sheet1(img) {
  let b = Tx(12, 19, T('拓竹 A1 木框封箱', 'Bambu Lab A1 Wooden Enclosure'), { size: 7, w: 700 });
  b += Tx(12, 26, T('木料加工图 · 外置供料（AMS lite 放箱外）+ 裁口压条版', 'Timber machining drawings · external feed (AMS lite outside) + rebate-and-bead version'), { size: 3.4, cls: 'mut' });
  b += `<image href="${img}" x="10" y="30" width="134" height="114" preserveAspectRatio="xMidYMid meet"/>`;
  b += Tx(12, 147, T('3D 模型截图（门半开，不含打印机）', '3D model view (door half open, printer hidden)'), { size: 2.2, cls: 'mut' });
  const facts = [
    [T('外框（木框外沿）', 'Frame (outside of wood)'), '640 × 700 × 680'],
    [T('内部净空 宽×深×高', 'Clear inside W×D×H'), '580 × 640 × 640'],
    [T('成品外形（含门、压条、脚垫）', 'Finished size (door, beads, feet)'), T('约 650 × 743 × 710', 'about 650 × 743 × 710')],
    [T('30×40 方条合计', '30×40 strip total'), T('10.0 m（6 根 2 m）', '10.0 m (6 × 2 m)')],
    [T('20×5 木压条合计', '20×5 bead total'), T('12.4 m（7 根 2 m）', '12.4 m (7 × 2 m)')]
  ];
  facts.forEach(([k, v], i) => { b += Tx(12, 154 + i * 5, k, { size: 2.4, cls: 'mut' }) + Tx(78, 154 + i * 5, v, { size: 2.5, w: 600 }); });

  let y = 34; const x = 152, w = 133;
  b += Tx(x, y, T('总说明', 'General notes'), { size: 3.6, w: 700 }); y += 6;
  const notes = [
    T('单位：毫米（mm）。', 'All dimensions in millimetres (mm).'),
    T('木料：30×40 木方，云杉或松木烘干料，四面刨光。裁口要用修边机自己做，或找能做「止口裁口」的木工房；普通木料店多数只能锯切，那样请用纯木方版图纸。', 'Timber: 30×40 kiln-dried spruce or pine, planed four sides. Cut the rebates yourself with a router or use a joinery shop that can do stopped rebates; most timber yards only cut to length, in which case use the plain-strip drawings.'),
    T('公差：长度 ±1，截面 ±0.5；裁口宽 10（+0.5 / 0），深 4（±0.3）。', 'Tolerances: length ±1, section ±0.5; rebate width 10 (+0.5 / 0), depth 4 (±0.3).'),
    T('所有裁口都是 10 宽 × 4 深：放入 3 mm 透明板 + 1 mm 泡棉后与木面平齐。', 'Every rebate is 10 wide × 4 deep, so a 3 mm panel on 1 mm foam sits flush with the wood.'),
    T('截面型号（第 3 页）：P0 无裁口；PA 在 40 面裁一条；PB 在 30 面裁一条；PC 两条，分别在 40 面和 30 面，位于对角。', 'Profiles (sheet 3): P0 no rebate; PA one rebate in a 40 face; PB one rebate in a 30 face; PC two rebates, one in a 40 face and one in a 30 face, on diagonally opposite corners.'),
    T('「通长」= 裁口贯通全长；「止口」= 两端留实木不裁，端部用凿子修成直角。', '"Full length" = the rebate runs end to end. "Stopped" = solid wood is left at both ends; square the ends with a chisel.'),
    T('先按长度下料，再裁口。每根料用铅笔写上编号（A1、B2…）。', 'Cut to length first, then rebate. Pencil the part number (A1, B2 …) on every piece.'),
    T('橙色斜线 = 裁口；蓝色虚线 = 透明板轮廓。', 'Orange hatching = rebate; blue dashed outline = clear panel.')
  ];
  notes.forEach((n, i) => {
    b += Tx(x, y, `${i + 1}`, { size: 2.5, w: 700 });
    const pr = para(x + 5, y, n, w - 5, 2.5, 1.5); b += pr.svg; y += pr.h + 1.6;
  });
  y += 3;
  b += Tx(x, y, T('图纸目录', 'Sheet list'), { size: 3.6, w: 700 }); y += 5.5;
  const list = [T('总览', 'Overview'), T('下料表', 'Cut list'), T('截面型号与安装节点', 'Profiles and panel detail'), T('框架零件图', 'Frame parts'),
    T('门框', 'Door frame'), T('框架装配三视图', 'Frame assembly views'), T('透明板', 'Clear panels'), T('附录：螺丝直固版', 'Appendix: screw-on version')];
  list.forEach((l, i) => { b += Tx(x, y + i * 4.6, `${i + 1}`, { size: 2.5, w: 700 }) + Tx(x + 6, y + i * 4.6, l, { size: 2.5 }); });
  return sheet(1, T('总览', 'Overview'), '—', b);
}

/* ---------- sheet 2: cut list ---------- */
function sheet2() {
  const parts = partsList();
  const cols = [
    { w: 12, title: T('编号', 'ID') }, { w: 30, title: T('名称', 'Part') }, { w: 26, title: T('规格（长）', 'Size (length)'), a: 'end' },
    { w: 13, title: T('截面', 'Profile'), a: 'middle' }, { w: 38, title: T('裁口', 'Rebate') }, { w: 12, title: T('数量', 'Qty'), a: 'middle' },
    { w: 60, title: T('位置', 'Location') }
  ];
  const rows = parts.map(p => [p.id, p.name, `30×40×${p.len}`, p.prof, rebTxt(p), String(p.qty), p.where]);
  rows.push(['F', T('底板', 'Base board'), '650×705×15', '—', '—', '1', T('桐木拼板，只裁尺寸', 'Paulownia panel, cut to size only')]);
  let b = Tx(12, 15, T('下料表 · 30×40 方条', 'Cut list · 30×40 strip'), { size: 3.6, w: 700 });
  const t = table(12, 19, cols, rows, { rh: 6.2 });
  b += t.svg;
  b += Tx(12, 19 + t.h + 5, T('方条合计 10 000 mm，16 根（A1–E），另加底板 1 块。', 'Strip total 10 000 mm, 16 pieces (A1–E), plus 1 base board.'), { size: 2.5, w: 600 });

  // stock nesting on 2 m lengths
  const pieces = [];
  parts.forEach(p => { for (let i = 0; i < p.qty; i++) pieces.push({ id: p.id, len: p.len }); });
  pieces.sort((a, c) => c.len - a.len);
  const sticks = [];
  pieces.forEach(pc => { const s = sticks.find(s => s.used + pc.len + 3 <= 2000); if (s) { s.cuts.push(pc); s.used += pc.len + 3; } else sticks.push({ cuts: [pc], used: pc.len + 3 }); });
  let y = 19 + t.h + 13;
  b += Tx(12, y, T('排料 · 2 m 长料，锯缝 3', 'Cutting plan · 2 m stock, 3 mm kerf'), { size: 3.2, w: 700 }); y += 4;
  const s = 0.066;
  sticks.forEach((st, i) => {
    const yy = y + i * 8.2;
    b += Tx(12, yy + 4.3, `#${i + 1}`, { size: 2.4, w: 700 });
    b += R(20, yy, 2000 * s, 6, 't');
    let cx = 20;
    st.cuts.forEach(c => {
      b += R(cx, yy, c.len * s, 6, 'wdp') + Tx(cx + c.len * s / 2, yy + 4.2, `${c.id} ${c.len}`, { size: 2.2, a: 'middle', w: 600 });
      cx += (c.len + 3) * s;
    });
  });

  // beads
  const bx = 160; let by = 19 + t.h + 13;
  b += Tx(bx, by, T('G 木压条 · 实木 20×5', 'G Glazing bead · solid wood 20×5'), { size: 3.2, w: 700 }); by += 3;
  const bt = table(bx, by, [{ w: 16, title: T('长度', 'Length'), a: 'end' }, { w: 12, title: T('数量', 'Qty'), a: 'middle' }, { w: 85, title: T('用途', 'Use') }], [
    ['660', '4', T('侧板 上、下边（2 块板）', 'Side panels, top & bottom (2 panels)')],
    ['640', '2', T('顶板 左、右边', 'Top panel, left & right')],
    ['620', '4', T('后板 上下边 2；顶板 前后边 2', 'Back panel top/bottom 2; top panel front/back 2')],
    ['600', '10', T('侧板 前后边 4；后板 左右边 2；门板 四边 4', 'Side panels front/back 4; back panel sides 2; door all 4')]
  ], { rh: 6 });
  b += bt.svg;
  const bn = para(bx, by + bt.h + 5, T('合计 12.4 m，买 7 根 2 m。可用桐木，也可买现成松木或榉木线条（更不易裂）。横向压条通长盖住转角，竖向压条夹在中间。', 'Total 12.4 m, buy 7 × 2 m. Paulownia works; ready-made pine or beech strip splits less. Horizontal beads run across the corners; upright beads fit between them.'), 113, 2.3, 1.45);
  b += bn.svg;

  // base board
  const fx = 110, fy = 155, fs = 1 / 30;
  b += Tx(fx + 50, fy - 2, T('F 底板 1:30', 'F Base board 1:30'), { size: 2.8, w: 700 });
  b += R(fx + 50, fy, 650 * fs, 705 * fs, 'wdp');
  b += R(fx + 50 + 5 * fs, fy + 5 * fs, 640 * fs, 700 * fs, 'hid');
  b += dimH(fx + 50, fx + 50 + 650 * fs, fy + 705 * fs + 3.5, '650', fy + 705 * fs + 0.4, fy + 705 * fs + 0.4);
  b += dimV(fy, fy + 705 * fs, fx + 50 + 650 * fs + 4, '705', fx + 50 + 650 * fs + 0.4, fx + 50 + 650 * fs + 0.4);
  b += para(fx + 88, fy + 3, T('15 厚桐木拼板。虚线 = 框架落位（左右、后侧各让 5，前侧齐平）。', '15 mm paulownia panel. Dashed = frame footprint (5 in at left, right and back; flush at the front).'), 88, 2.3, 1.45).svg;
  return sheet(2, T('下料表', 'Cut list'), '—', b);
}

/* ---------- sheet 3: profiles + detail ---------- */
function sheet3() {
  let b = Tx(12, 15, T('截面型号（比例 1.2:1）', 'Profiles (scale 1.2:1)'), { size: 3.6, w: 700 });
  const s = 1.2;
  const uses = { P0: 'B1', PA: 'A1  B2  C1  D  E', PB: 'B3', PC: 'A2  B4  C2' };
  const desc = {
    P0: T('无裁口', 'No rebate'),
    PA: T('在 40 面靠一边裁 10 宽、4 深', 'One rebate in a 40 face: 10 wide, 4 deep'),
    PB: T('在 30 面靠一边裁 10 宽、4 深', 'One rebate in a 30 face: 10 wide, 4 deep'),
    PC: T('两条：40 面一条 + 30 面一条，位于对角', 'Two: one in a 40 face + one in a 30 face, diagonal corners')
  };
  ['P0', 'PA', 'PB', 'PC'].forEach((k, i) => {
    const ox = 30 + i * 68, oy = 76;
    b += Tx(ox - 14, 26, k, { size: 5, w: 700 });
    b += section(ox, oy, s, k, true);
    b += Tx(ox - 9, oy - 20 * s, T('40 面', '40 face'), { size: 2, cls: 'mut', rot: -90, a: 'middle' });
    b += Tx(ox + 15 * s, oy + 11, T('30 面', '30 face'), { size: 2, cls: 'mut', a: 'middle' });
    b += para(ox - 14, oy + 18, desc[k], 60, 2.3, 1.4).svg;
    b += Tx(ox - 14, oy + 25, T('用于：', 'Used for: ') + uses[k], { size: 2.4, w: 600 });
  });

  // detail: panel in rebate. H runs to the right, X runs down (into the frame).
  b += Tx(12, 112, T('安装节点详图（比例 1.6:1，以底框侧梁 C1 为例，所有裁口同理）', 'Panel detail (scale 1.6:1, bottom side rail C1 shown; every rebate works the same way)'), { size: 3.2, w: 700 });
  const ox = 50, oy = 140, d = 1.6;
  const P = (h, xx) => [ox + h * d, oy + xx * d];
  b += Poly([[0, 0], [30, 0], [30, 4], [40, 4], [40, 30], [0, 30]].map(([h, xx]) => P(h, xx)), 'wd');
  b += R(...P(32, 3), 8 * d, 1 * d, 'foam');
  b += R(...P(32, 0), 48 * d, 3 * d, 'panS');
  b += Ln(...P(80, -1.5), ...P(80, 4.5), 't');
  b += R(...P(20, -5), 20 * d, 5 * d, 'bead');
  b += R(...P(24.2, -5), 1.6 * d, 16 * d, 'steel');
  b += Poly([P(22.5, -5), P(27.5, -5), P(25.8, -3.3), P(24.2, -3.3)], 'steel');
  b += Tx(170, 122, T('箱外', 'Outside'), { size: 2.4, cls: 'mut' });
  b += Tx(170, 172, T('箱内（开口）', 'Inside (opening)'), { size: 2.4, cls: 'mut' });
  // labels
  b += leader(...P(10, 22), 44, 178, T('木框 C1（30×40）', 'Frame C1 (30×40)'), 'end');
  b += leader(...P(25, -4.2), 44, 124, T('沉头木螺丝 3×16，间距 ≤150', 'Screw 3×16, ≤150 apart'), 'end');
  b += leader(...P(38, -4), 122, 124, T('木压条 20×5', 'Bead 20×5'));
  b += leader(...P(60, 1.5), 140, 132, T('透明板 3 mm，与木面平齐', '3 mm panel, flush with the wood'));
  b += leader(...P(37, 3.5), 122, 160, T('泡棉 1×8，贴裁口底面', 'Foam 1×8 on the rebate floor'));
  // dims
  b += dimH(P(30, 0)[0], P(40, 0)[0], P(0, 30)[1] + 4, '10', P(30, 4)[1] + 0.5, P(40, 30)[1] + 0.5);
  b += dimV(P(0, 0)[1], P(0, 4)[1], P(40, 0)[0] + 5, '4', P(40, 0)[0] + 0.5, P(40, 4)[0] + 0.5, { ty: P(0, 2)[1] });
  b += dimH(P(30, 0)[0], P(32, 0)[0], P(0, -5)[1] - 4, '2', P(30, -0.5)[1], P(32, -0.5)[1]);
  b += dimH(P(32, 0)[0], P(40, 0)[0], P(0, -5)[1] - 9, '8', P(32, -0.5)[1], P(40, -0.5)[1]);
  b += dimH(P(20, 0)[0], P(40, 0)[0], P(0, -5)[1] - 14, '20', P(20, -5)[1] - 0.5, P(40, -5)[1] - 0.5);
  b += dimV(P(0, -5)[1], P(0, 0)[1], P(20, 0)[0] - 4, '5', P(20, 0)[0] - 0.5, P(20, 0)[0] - 0.5, { ty: P(0, -2.5)[1] });
  b += dimH(P(0, 0)[0], P(40, 0)[0], P(0, 30)[1] + 9, '40', P(0, 30)[1] + 0.5, P(40, 30)[1] + 0.5);
  b += para(196, 124, T('2 mm = 伸缩间隙：板材受热会伸长，不要顶死。', '2 mm = expansion gap: the panel grows when warm, so it must not be wedged in.'), 88, 2.3, 1.45).svg;
  b += para(196, 135, T('8 mm = 板边压进裁口的宽度。', '8 mm = how far the panel edge sits in the rebate.'), 88, 2.3, 1.45).svg;
  b += para(196, 143, T('装板时在四周临时塞 2 mm 垫片定位，压条拧好后取出。', 'Centre the panel with 2 mm spacers, then remove them once the beads are on.'), 88, 2.3, 1.45).svg;
  return sheet(3, T('截面型号与安装节点', 'Profiles and panel detail'), '1.2:1 / 1.6:1', b);
}

/* ---------- sheet 4: frame parts ---------- */
function sheet4() {
  let b = Tx(12, 15, T('框架零件图（A1–C2）', 'Frame parts (A1–C2)'), { size: 3.6, w: 700 });
  b += Tx(120, 15, T('比例 1:5。条形图 = 有裁口的那一面；虚线 = 对角另一条裁口（在背面）；右侧小图 = 截面。', 'Scale 1:5. Bar = the rebated face; dashed = the second rebate on the opposite corner (far side); small drawing = section.'), { size: 2.2, cls: 'mut' });
  const parts = partsList().filter(p => /^[ABC]/.test(p.id));
  parts.forEach((p, i) => { const y = 19 + i * 20.2; b += partRow(12, y, p); if (i) b += Ln(12, y - 1, 287, y - 1, 'hid'); });
  return sheet(4, T('框架零件图', 'Frame parts'), '1:5', b);
}

function tag(x, y, label) { return Circ(x, y, 3.2, 'bal') + Tx(x, y + 1.05, label, { size: 2.6, a: 'middle', w: 700 }); }

/* ---------- sheet 5: door ---------- */
function sheet5() {
  let b = Tx(12, 15, T('门框 正视（从箱外看，比例 1:6）', 'Door frame, front view (from outside, scale 1:6)'), { size: 3.6, w: 700 });
  const s = 1 / 6, ox = 34, oy = 160;
  const X = v => ox + v * s, Y = h => oy - h * s;
  b += R(X(0), Y(680), 40 * s, 680 * s, 'wdp') + R(X(600), Y(680), 40 * s, 680 * s, 'wdp');
  b += R(X(40), Y(40), 560 * s, 40 * s, 'wdp') + R(X(40), Y(680), 560 * s, 40 * s, 'wdp');
  b += `<path d="M${f(X(30))},${f(Y(650))}H${f(X(610))}V${f(Y(30))}H${f(X(30))}Z M${f(X(40))},${f(Y(640))}V${f(Y(40))}H${f(X(600))}V${f(Y(640))}Z" fill-rule="evenodd" class="reb"/>`;
  b += R(X(32), Y(648), 576 * s, 616 * s, 'pan');
  [112, 262, 418, 568].forEach(h => { b += Circ(X(619), Y(h), 6 * s + 0.2, 'hid'); });
  [90, 340, 590].forEach(h => { b += R(X(-3), Y(h + 25), 3 * s, 50 * s, 'steel'); });
  b += tag(X(20), Y(400), 'D') + tag(X(620), Y(340), 'D') + tag(X(320), Y(20), 'E') + tag(X(320), Y(660), 'E');
  b += leader(X(619), Y(568), X(640) + 24, Y(610), T('背面磁铁槽 Ø12×2.5', 'Magnet pockets (back)'));
  b += leader(X(320), Y(470), X(640) + 24, Y(470), T('门板 576×616', 'Door panel 576×616'));
  b += leader(X(-1.5), Y(590), X(0) - 4, Y(640), T('合页', 'Hinges'), 'end');
  // dims
  b += dimH(X(0), X(640), Y(680) - 6, '640', Y(680) - 0.5, Y(680) - 0.5);
  b += dimH(X(30), X(610), Y(680) - 12, T('裁口外沿 580', 'rebate 580'), Y(650), Y(650));
  b += dimH(X(40), X(600), Y(0) + 6, T('开口 560', 'opening 560'), Y(40), Y(40));
  b += dimH(X(0), X(40), Y(0) + 11, '40', Y(0) + 0.5, Y(0) + 0.5);
  b += dimV(Y(0), Y(680), X(640) + 6, '680', X(640) + 0.5, X(640) + 0.5);
  b += dimV(Y(30), Y(650), X(640) + 12, '620', X(610), X(610));
  b += dimV(Y(40), Y(640), X(640) + 18, '600', X(600), X(600));
  b += dimV(Y(0), Y(30), X(0) - 5, '30', X(0) - 0.5, X(0) - 0.5);
  b += para(12, 176, T('裁口一圈连续：外沿 580×620，内沿 560×600。竖梃 D 止口（30–650），横档 E 通长，在四角接上。磁铁槽和合页由自己做，不需木料店加工。', 'The rebate is one continuous ring, 580×620 outside / 560×600 inside. Stiles D are stopped (30–650); rails E run full length; they meet at the corners. Magnet pockets and hinges are DIY, not shop work.'), 172, 2.3, 1.45).svg;

  b += Tx(200, 24, T('零件', 'Parts'), { size: 3.2, w: 700 });
  partsList().filter(p => /^[DE]$/.test(p.id)).forEach((p, i) => {
    const y = 30 + i * 44;
    b += partRow(200, y, p, { sx: 0.1, barX: 200, barDY: 12, iconX: 274, noteX: 200, noteY: y + 27, noteW: 86 });
  });
  return sheet(5, T('门框', 'Door frame'), '1:6', b);
}

/* ---------- sheet 6: frame assembly ---------- */
function sheet6() {
  let b = '';
  const s = 0.1;
  { // FRONT
    const ox = 40, oy = 88; const X = v => ox + v * s, Y = h => oy - h * s;
    b += Tx(15, 15, T('前视（不含门）', 'Front view (door removed)'), { size: 3, w: 700 });
    b += R(X(-5), Y(0), 650 * s, 15 * s, 'wdp');
    b += R(X(0), Y(40), 640 * s, 40 * s, 'wdp') + R(X(0), Y(680), 640 * s, 40 * s, 'wdp');
    b += R(X(0), Y(640), 30 * s, 600 * s, 'wdp') + R(X(610), Y(640), 30 * s, 600 * s, 'wdp');
    b += balloon(X(60), Y(660), 'B3', X(0) - 10, Y(660));
    b += balloon(X(15), Y(340), 'A1', X(0) - 10, Y(340));
    b += balloon(X(60), Y(20), 'B1', X(0) - 10, Y(20));
    b += dimH(X(0), X(640), Y(-15) + 4, '640', Y(-15) + 0.5, Y(-15) + 0.5);
    b += dimV(Y(0), Y(680), X(640) + 8, '680', X(640) + 0.5, X(640) + 0.5);
    b += dimV(Y(40), Y(640), X(640) + 14, '600', X(640) + 0.5, X(640) + 0.5);
  }
  { // RIGHT SIDE (front on the left)
    const ox = 172, oy = 88; const X = v => ox + v * s, Y = h => oy - h * s;
    b += Tx(150, 15, T('右侧视（前在左；左侧对称）', 'Right side view (front on the left; left side mirrors it)'), { size: 3, w: 700 });
    b += R(X(0), Y(0), 705 * s, 15 * s, 'wdp');
    b += R(X(30), Y(40), 640 * s, 40 * s, 'wdp') + R(X(30), Y(680), 640 * s, 40 * s, 'wdp');
    [[0, 0], [670, 0], [0, 640], [670, 640]].forEach(([d0, h0]) => { b += R(X(d0), Y(h0 + 40), 30 * s, 40 * s, 'wdp'); });
    b += R(X(0), Y(640), 40 * s, 600 * s, 'wdp') + R(X(660), Y(640), 40 * s, 600 * s, 'wdp');
    b += R(X(30), Y(640), 10 * s, 600 * s, 'reb') + R(X(660), Y(640), 10 * s, 600 * s, 'reb');
    b += R(X(30), Y(40), 640 * s, 10 * s, 'reb') + R(X(30), Y(650), 640 * s, 10 * s, 'reb');
    b += R(X(32), Y(648), 636 * s, 616 * s, 'pan');
    b += balloon(X(100), Y(660), 'C2', X(0) - 10, Y(660));
    b += balloon(X(20), Y(340), 'A1', X(0) - 10, Y(340));
    b += balloon(X(100), Y(20), 'C1', X(0) - 10, Y(20));
    b += balloon(X(680), Y(340), 'A2', X(700) + 10, Y(340));
    b += Tx(X(48), Y(600), T('← 前', '← Front'), { size: 2.3, cls: 'mut' });
    b += dimH(X(0), X(700), Y(-15) + 4, '700', Y(-15) + 0.5, Y(-15) + 0.5);
    b += dimH(X(40), X(660), Y(150), T('开口 620', 'opening 620'));
    b += dimV(Y(40), Y(640), X(520), T('开口 600', 'opening 600'));
  }
  { // BACK (from outside: enclosure's right side is on the left)
    const ox = 40, oy = 172; const X = v => ox + (640 - v) * s, Y = h => oy - h * s;
    b += Tx(15, 101, T('后视（从箱外看）', 'Back view (from outside)'), { size: 3, w: 700 });
    b += R(X(645), Y(0), 650 * s, 15 * s, 'wdp');
    b += R(X(640), Y(40), 640 * s, 40 * s, 'wdp') + R(X(640), Y(680), 640 * s, 40 * s, 'wdp');
    b += R(X(30), Y(640), 30 * s, 600 * s, 'wdp') + R(X(640), Y(640), 30 * s, 600 * s, 'wdp');
    b += R(X(30), Y(640), 10 * s, 600 * s, 'reb') + R(X(620), Y(640), 10 * s, 600 * s, 'reb');
    b += R(X(620), Y(40), 600 * s, 10 * s, 'reb') + R(X(620), Y(650), 600 * s, 10 * s, 'reb');
    b += R(X(618), Y(648), 596 * s, 616 * s, 'pan');
    b += Circ(X(530), Y(95), 25 * s, 'hid') + Circ(X(115), Y(565), 58 * s, 'hid');
    b += balloon(X(580), Y(660), 'B4', X(640) - 10, Y(660));
    b += balloon(X(625), Y(340), 'A2', X(640) - 10, Y(340));
    b += balloon(X(580), Y(20), 'B2', X(640) - 10, Y(20));
    b += leader(X(115), Y(565), 107, Y(610), T('Ø116 风扇孔（可选）', 'Ø116 fan (optional)'));
    b += leader(X(530), Y(95), 107, Y(130), T('Ø50 过线孔', 'Ø50 grommet'));
    b += para(107, 140, T('B2、B4 背面裁口为止口，两端各留 20（见第 4 页）。', 'B2 and B4 rebates are stopped, 20 solid at each end (see sheet 4).'), 36, 2.2, 1.4).svg;
  }
  { // TOP (front at the bottom)
    const ox = 172, oy = 172; const X = v => ox + v * s, Y = dd => oy - dd * s;
    b += Tx(150, 101, T('俯视（前在下）', 'Top view (front at the bottom)'), { size: 3, w: 700 });
    b += R(X(-5), Y(705), 650 * s, 705 * s, 'hid');
    b += R(X(0), Y(30), 640 * s, 30 * s, 'wdp') + R(X(0), Y(700), 640 * s, 30 * s, 'wdp');
    b += R(X(0), Y(670), 30 * s, 640 * s, 'wdp') + R(X(610), Y(670), 30 * s, 640 * s, 'wdp');
    b += R(X(20), Y(30), 600 * s, 10 * s, 'reb') + R(X(20), Y(680), 600 * s, 10 * s, 'reb');
    b += R(X(20), Y(670), 10 * s, 640 * s, 'reb') + R(X(610), Y(670), 10 * s, 640 * s, 'reb');
    b += R(X(22), Y(678), 596 * s, 656 * s, 'pan');
    b += Circ(X(540), Y(590), 25 * s, 'hid');
    b += balloon(X(60), Y(685), 'B4', X(-5) - 10, Y(640));
    b += balloon(X(15), Y(350), 'C2', X(-5) - 10, Y(350));
    b += balloon(X(60), Y(15), 'B3', X(-5) - 10, Y(15));
    b += dimV(Y(0), Y(700), X(640) + 8, '700', X(640) + 0.5, X(640) + 0.5);
    b += dimH(X(30), X(610), Y(350), T('开口 580', 'opening 580'));
    b += dimV(Y(30), Y(670), X(480), T('开口 640', 'opening 640'));
    b += leader(X(540), Y(590), 252, Y(630), T('Ø50 PTFE 过线孔', 'Ø50 PTFE grommet'));
  }
  b += Ln(145, 12, 145, 178, 'hid') + Ln(12, 97, 287, 97, 'hid');
  return sheet(6, T('框架装配三视图', 'Frame assembly views'), '1:10', b);
}

/* ---------- sheet 7: panels ---------- */
function sheet7() {
  let b = Tx(12, 15, T('透明板（裁口版，比例 1:10，从箱外看）', 'Clear panels (rebate version, scale 1:10, seen from outside)'), { size: 3.6, w: 700 });
  const s = 0.1;
  const panels = [
    { id: 'P1', name: T('侧板（左/右）', 'Side panel (L/R)'), w: 636, h: 616, qty: 2, holes: [] },
    { id: 'P2', name: T('后板', 'Back panel'), w: 596, h: 616, qty: 1, holes: [{ x: 88, y: 616 - 63, d: 50 }, { x: 596 - 93, y: 83, d: 116, opt: true }] },
    { id: 'P3', name: T('顶板', 'Top panel'), w: 596, h: 656, qty: 1, holes: [{ x: 596 - 78, y: 88, d: 50 }] },
    { id: 'P4', name: T('门板', 'Door panel'), w: 576, h: 616, qty: 1, holes: [] }
  ];
  let x = 18;
  panels.forEach(p => {
    const y = 30;
    b += Tx(x, 24, `${p.id} ${p.name} ×${p.qty}`, { size: 2.8, w: 700 });
    b += R(x, y, p.w * s, p.h * s, 'panS');
    p.holes.forEach(hh => {
      b += Circ(x + hh.x * s, y + hh.y * s, hh.d / 2 * s, hh.opt ? 'hid' : 'o');
      b += Ln(x + hh.x * s - 1.5, y + hh.y * s, x + hh.x * s + 1.5, y + hh.y * s, 't') + Ln(x + hh.x * s, y + hh.y * s - 1.5, x + hh.x * s, y + hh.y * s + 1.5, 't');
    });
    b += dimH(x, x + p.w * s, y + p.h * s + 5, String(p.w), y + p.h * s + 0.5, y + p.h * s + 0.5);
    b += dimV(y, y + p.h * s, x - 3.5, String(p.h), x - 0.5, x - 0.5);
    x += p.w * s + 10;
  });
  const rows = [
    ['P2', T('Ø50 过线孔', 'Ø50 grommet hole'), T('距左边 88，距下边 63（从箱外看；靠打印机电源口一侧）', '88 from the left edge, 63 from the bottom (seen from outside; power-socket side)')],
    ['P2', T('Ø116 风扇孔（可选）', 'Ø116 fan hole (optional)'), T('距右边 93，距上边 83', '93 from the right edge, 83 from the top')],
    ['P3', T('Ø50 过线孔', 'Ø50 grommet hole'), T('距右边 78，距上边（后边）88；图中上边 = 箱子后侧', '78 from the right edge, 88 from the top (rear) edge; top of the drawing = back of the box')]
  ];
  const t = table(12, 112, [{ w: 14, title: T('板', 'Panel') }, { w: 46, title: T('开孔', 'Hole') }, { w: 150, title: T('位置（到孔中心）', 'Position (to hole centre)') }], rows, { rh: 6.2 });
  b += t.svg;
  const notes = [
    T('材料：3 mm 浇铸亚克力或实心 PC 耐力板（门板建议用耐力板）。不要用中空阳光板，它不透明。', 'Material: 3 mm cast acrylic or solid polycarbonate (solid PC recommended for the door). Not twin-wall PC: it is not see-through.'),
    T('尺寸公差 ±0.5，边缘抛光，保留保护膜。四周不打螺丝孔。', 'Size tolerance ±0.5, polished edges, protective film left on. No screw holes around the edges.'),
    T('孔位可按 A1 电源口和 AMS lite 摆放位置现场微调。拉手孔拿到拉手后再开。', 'Hole positions can be adjusted to suit the A1 power socket and the AMS lite. Drill the door-handle holes once you have the handle.')
  ];
  let y = 112 + t.h + 7;
  notes.forEach(n => { const pr = para(12, y, '· ' + n, 170, 2.4, 1.5); b += pr.svg; y += pr.h + 1; });
  return sheet(7, T('透明板', 'Clear panels'), '1:10', b);
}

/* ---------- sheet 8: appendix, screw-on version ---------- */
function sheet8() {
  let b = Tx(12, 15, T('附录：螺丝直固版（不裁口）', 'Appendix: screw-on version (no rebates)'), { size: 3.6, w: 700 });
  b += para(12, 21, T('如果没有修边机、木料店也不能代裁口，就用这一版：所有方条都不裁口，透明板盖在木框外表面，用 ST4×20 + 尼龙垫圈固定。只有下表和透明板与裁口版不同，其余图纸照用（忽略裁口）。', 'Use this version if you have no router and the timber shop cannot cut rebates: no strip is rebated, and the panels lie on the outside of the frame, fixed with ST4×20 screws and nylon washers. Only this sheet differs; the other sheets still apply (ignore the rebates).'), 270, 2.4, 1.5).svg;
  const t = table(12, 31, [{ w: 12, title: T('编号', 'ID') }, { w: 36, title: T('名称', 'Part') }, { w: 26, title: T('规格', 'Size'), a: 'end' }, { w: 12, title: T('数量', 'Qty'), a: 'middle' }], [
    ['A', T('立柱', 'Post'), '30×40×600', '4'], ['B', T('顶/底框 前后梁', 'Front/back rail'), '30×40×640', '4'], ['C', T('顶/底框 侧梁', 'Side rail'), '30×40×640', '4'],
    ['D', T('门框竖梃', 'Door stile'), '30×40×683', '2'], ['E', T('门框横档', 'Door rail'), '30×40×566', '2'], ['F', T('底板', 'Base board'), '650×705×15', '1']
  ], { rh: 6.2 });
  b += t.svg;
  b += Tx(12, 31 + t.h + 5, T('方条合计 10 018 mm（6 根 2 m）；不需要木压条。', 'Strip total 10 018 mm (6 × 2 m); no beads.'), { size: 2.4, w: 600 });

  const pt = table(12, 31 + t.h + 12, [{ w: 12, title: T('板', 'Panel') }, { w: 28, title: T('尺寸', 'Size'), a: 'end' }, { w: 10, title: T('数', 'Qty'), a: 'middle' }, { w: 36, title: T('孔距（长边 / 短边）', 'Pitch (long / short)') }], [
    ['P1', '700×680', '2', '167.5 / 162.5'], ['P2', '646×680', '1', '162.5 / 154'], ['P3', '646×703', '1', '168.25 / 154'], ['P4', '646×683', '1', '163.25 / 154']
  ], { rh: 6.2 });
  b += pt.svg;
  b += para(12, 31 + t.h + 12 + pt.h + 5, T('每块板四边各 5 孔（四角共用，共 16 孔），Ø6，孔中心距边 15。P2 Ø50 孔：从箱外看距左 113、距下 95；可选 Ø116 风扇孔距右 118、距上 115。P3 Ø50 孔：距右 103、距上（后）113。', 'Each panel has 5 holes per edge (corners shared, 16 in all), Ø6, centres 15 from the edge. P2 Ø50 hole: 113 from the left and 95 from the bottom, seen from outside; optional Ø116 fan hole 118 from the right and 115 from the top. P3 Ø50 hole: 103 from the right, 113 from the top (rear) edge.'), 96, 2.3, 1.45).svg;

  // P1 hole layout drawing
  const s = 0.18, ox = 130, oy = 46, w = 700, h = 680;
  b += Tx(ox, oy - 12, T('P1 侧板孔位 1:5.5（其余板同理）', 'P1 hole layout 1:5.5 (others alike)'), { size: 2.8, w: 700 });
  b += R(ox, oy, w * s, h * s, 'panS');
  const xs = [15, 182.5, 350, 517.5, 685], ys = [15, 177.5, 340, 502.5, 665];
  const holes = [];
  xs.forEach(xx => { holes.push([xx, 15], [xx, 665]); });
  ys.slice(1, -1).forEach(yy => { holes.push([15, yy], [685, yy]); });
  holes.forEach(([xx, yy]) => { b += Circ(ox + xx * s, oy + yy * s, 3 * s + 0.3, 'o'); });
  b += dimH(ox, ox + w * s, oy + h * s + 5, '700', oy + h * s + 0.5, oy + h * s + 0.5);
  b += dimV(oy, oy + h * s, ox - 4, '680', ox - 0.5, ox - 0.5);
  b += dimH(ox, ox + 15 * s, oy - 7, '15', oy - 0.5, oy + 15 * s);
  b += dimH(ox + 15 * s, ox + 182.5 * s, oy - 7, '167.5', oy + 15 * s, oy + 15 * s);
  b += dimV(oy + 15 * s, oy + 177.5 * s, ox + w * s + 5, '162.5', ox + 685 * s, ox + 685 * s);
  b += Tx(ox + w * s / 2, oy + h * s / 2, T('16 × Ø6', '16 × Ø6'), { size: 3, a: 'middle', w: 600 });
  return sheet(8, T('附录：螺丝直固版', 'Appendix: screw-on version'), '—', b);
}

/* ===================== plain-strip version (main) ===================== */
// Shop only cuts 30×40 strips to length. Panels screw onto the outside of the frame.
function purePartsList() {
  return [
    { id: 'A', name: T('立柱', 'Post'), len: 600, qty: 4, note: T('四角各一根，30 面朝前后，立在底框上', 'One per corner, 30 mm face to front/back, standing on the bottom frame') },
    { id: 'B', name: T('顶/底框 前后梁', 'Top/bottom frame, front & back rail'), len: 640, qty: 4, note: T('通长，40 高立放', 'Full length, 40 mm on edge') },
    { id: 'C', name: T('顶/底框 侧梁', 'Top/bottom frame, side rail'), len: 640, qty: 4, note: T('夹在前后梁之间', 'Fits between the front and back rails') },
    { id: 'D', name: T('门框竖梃', 'Door stile'), len: 683, qty: 2, note: T('门左、右，通长', 'Door left & right, full height') },
    { id: 'E', name: T('门框横档', 'Door rail'), len: 566, qty: 2, note: T('夹在竖梃之间', 'Fits between the stiles') }
  ];
}
function nestSticks(parts) {
  const pieces = [];
  parts.forEach(p => { for (let i = 0; i < p.qty; i++) pieces.push({ id: p.id, len: p.len }); });
  pieces.sort((a, c) => c.len - a.len);
  const sticks = [];
  pieces.forEach(pc => { const s = sticks.find(s => s.used + pc.len + 3 <= 2000); if (s) { s.cuts.push(pc); s.used += pc.len + 3; } else sticks.push({ cuts: [pc], used: pc.len + 3 }); });
  return sticks;
}
const PANELS_PURE = () => [
  { id: 'P1', name: T('侧板（左/右）', 'Side panel (L/R)'), w: 700, h: 680, qty: 2, holes: [] },
  { id: 'P2', name: T('后板', 'Back panel'), w: 646, h: 680, qty: 1, holes: [{ x: 113, y: 680 - 95, d: 50 }, { x: 646 - 118, y: 115, d: 116, opt: true }] },
  { id: 'P3', name: T('顶板', 'Top panel'), w: 646, h: 703, qty: 1, holes: [{ x: 646 - 103, y: 113, d: 50 }] },
  { id: 'P4', name: T('门板', 'Door panel'), w: 646, h: 683, qty: 1, holes: [] }
];
const edgeHoles = (w, h) => {
  const xs = spaced(15, w - 15, 175), ys = spaced(15, h - 15, 175), out = [];
  xs.forEach(x => out.push([x, 15], [x, h - 15]));
  ys.slice(1, -1).forEach(y => out.push([15, y], [w - 15, y]));
  return { pts: out, px: (xs[1] - xs[0]), py: (ys[1] - ys[0]) };
};
function spaced(a, b, max) { const n = Math.max(1, Math.ceil((b - a) / max)); return Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n); }
const fmt = n => String(+n.toFixed(2));

function pSheet1(img) {
  let b = Tx(12, 19, T('拓竹 A1 木框封箱', 'Bambu Lab A1 Wooden Enclosure'), { size: 7, w: 700 });
  b += Tx(12, 26, T('木料加工图 · 外置供料（AMS lite 放箱外）· 纯木方版', 'Timber drawings · external feed (AMS lite outside) · plain-strip version'), { size: 3.4, cls: 'mut' });
  b += `<image href="${img}" x="10" y="30" width="134" height="114" preserveAspectRatio="xMidYMid meet"/>`;
  b += Tx(12, 147, T('3D 模型截图（门半开，不含打印机）', '3D model view (door half open, printer hidden)'), { size: 2.2, cls: 'mut' });
  const facts = [
    [T('外框（木框外沿）', 'Frame (outside of wood)'), '640 × 700 × 680'],
    [T('内部净空 宽×深×高', 'Clear inside W×D×H'), '580 × 640 × 640'],
    [T('成品外形（含门、脚垫）', 'Finished size (door, feet)'), T('约 650 × 741 × 708', 'about 650 × 741 × 708')],
    [T('30×40 木方合计', '30×40 strip total'), T('10.0 m，16 根（6 根 2 m 料）', '10.0 m, 16 pieces (6 × 2 m)')],
    [T('透明板', 'Clear panels'), T('3 mm，5 块，每块 16 个 Ø6 孔', '3 mm, 5 panels, 16 × Ø6 holes each')]
  ];
  facts.forEach(([k, v], i) => { b += Tx(12, 154 + i * 5, k, { size: 2.4, cls: 'mut' }) + Tx(78, 154 + i * 5, v, { size: 2.5, w: 600 }); });
  let y = 34; const x = 152, w = 133;
  b += Tx(x, y, T('总说明', 'General notes'), { size: 3.6, w: 700 }); y += 6;
  const notes = [
    T('单位：毫米（mm）。', 'All dimensions in millimetres (mm).'),
    T('木料：30×40 木方，云杉或松木烘干料（含水率 8–12%），四面刨光，挑直纹少节疤的（桐木也行，但握钉力差）。', 'Timber: 30×40 strip, kiln-dried spruce or pine (8–12 % moisture), planed four sides, straight grain with few knots. Paulownia also works but holds screws poorly.'),
    T('木料店只需按长度锯切：不开槽、不裁口、不打孔。端面锯直（90°）。', 'The timber shop only cuts to length: no grooves, no rebates, no holes. Square (90°) end cuts.'),
    T('公差：长度 ±1，截面 ±0.5。', 'Tolerances: length ±1, section ±0.5.'),
    T('透明板盖在木框外表面，用 ST4×20 螺丝 + 尼龙垫圈固定，下面垫 3 mm 泡棉条，不用胶粘（见第 4 页节点）。', 'Panels sit on the outside of the frame on 3 mm foam tape, held by ST4×20 screws with nylon washers, not glue (detail on sheet 4).'),
    T('所有木螺丝先打 Ø3 引孔，靠近料端的尤其要打；木-木接缝上白乳胶。', 'Pre-drill Ø3 pilot holes for every wood screw, especially near strip ends; glue every wood-to-wood joint.'),
    T('每根料用铅笔写上编号（A–E）。', 'Pencil the part letter (A–E) on every piece.')
  ];
  notes.forEach((n, i) => { b += Tx(x, y, `${i + 1}`, { size: 2.5, w: 700 }); const pr = para(x + 5, y, n, w - 5, 2.5, 1.5); b += pr.svg; y += pr.h + 1.6; });
  y += 3;
  b += Tx(x, y, T('图纸目录', 'Sheet list'), { size: 3.6, w: 700 }); y += 5.5;
  [T('总览', 'Overview'), T('下料表', 'Cut list'), T('框架装配三视图', 'Frame assembly views'), T('门框与安装节点', 'Door frame and fixing details'), T('透明板与开孔', 'Clear panels and holes')]
    .forEach((l, i) => { b += Tx(x, y + i * 4.6, `${i + 1}`, { size: 2.5, w: 700 }) + Tx(x + 6, y + i * 4.6, l, { size: 2.5 }); });
  return sheet(1, T('总览', 'Overview'), '—', b);
}

function pSheet2() {
  const parts = purePartsList();
  let b = Tx(12, 15, T('下料表 · 30×40 木方（只锯切，不加工）', 'Cut list · 30×40 strip (cut to length only)'), { size: 3.6, w: 700 });
  const t = table(12, 19, [
    { w: 14, title: T('编号', 'ID') }, { w: 46, title: T('名称', 'Part') }, { w: 30, title: T('规格', 'Size'), a: 'end' },
    { w: 14, title: T('数量', 'Qty'), a: 'middle' }, { w: 92, title: T('位置', 'Location') }
  ], [
    ...parts.map(p => [p.id, p.name, `30×40×${p.len}`, String(p.qty), p.note]),
    ['F', T('底板', 'Base board'), '650×705×15', '1', T('15 mm 实木拼板或多层板', '15 mm solid-wood panel or plywood')]
  ], { rh: 6.6, size: 2.6 });
  b += t.svg;
  b += Tx(12, 19 + t.h + 6, T('木方合计 10 018 mm，16 根；底板 1 块。', 'Strip total 10 018 mm, 16 pieces; 1 base board.'), { size: 2.6, w: 600 });

  const sticks = nestSticks(parts);
  let y = 19 + t.h + 16;
  b += Tx(12, y, T('排料 · 2 m 长料，锯缝 3', 'Cutting plan · 2 m stock, 3 mm kerf'), { size: 3.2, w: 700 }); y += 4;
  const s = 0.066;
  sticks.forEach((st, i) => {
    const yy = y + i * 8.2;
    b += Tx(12, yy + 4.3, `#${i + 1}`, { size: 2.4, w: 700 });
    b += R(20, yy, 2000 * s, 6, 't');
    let cx = 20;
    st.cuts.forEach(c => { b += R(cx, yy, c.len * s, 6, 'wdp') + Tx(cx + c.len * s / 2, yy + 4.2, `${c.id} ${c.len}`, { size: 2.2, a: 'middle', w: 600 }); cx += (c.len + 3) * s; });
  });

  // base board
  const bx = 228, by = 22, fs = 1 / 12;
  b += Tx(bx - 8, by - 3, T('F 底板 1:12', 'F Base board 1:12'), { size: 2.8, w: 700 });
  b += R(bx, by + 2, 650 * fs, 705 * fs, 'wdp');
  b += R(bx + 5 * fs, by + 2, 640 * fs, 700 * fs, 'hid');
  b += dimH(bx, bx + 650 * fs, by + 2 + 705 * fs + 4, '650', by + 2 + 705 * fs + 0.4, by + 2 + 705 * fs + 0.4);
  b += dimV(by + 2, by + 2 + 705 * fs, bx + 650 * fs + 4, '705', bx + 650 * fs + 0.4, bx + 650 * fs + 0.4);
  b += para(bx - 8, by + 75, T('虚线 = 框架落位：前侧齐平，左右、后侧各让 5。', 'Dashed = frame footprint: flush at the front, 5 in at the left, right and back.'), 62, 2.3, 1.45).svg;
  return sheet(2, T('下料表', 'Cut list'), '—', b);
}

function pSheet3() {
  let b = '';
  const s = 0.1;
  const note = T('前后梁 B 通长，侧梁 C 夹在中间；立柱 A 立在底框上，顶框压在立柱上。', 'Rails B run full width, side rails C fit between them; posts A stand on the bottom frame and the top frame sits on the posts.');
  { // FRONT
    const ox = 40, oy = 88; const X = v => ox + v * s, Y = h => oy - h * s;
    b += Tx(15, 15, T('前视（不含门）', 'Front view (door removed)'), { size: 3, w: 700 });
    b += R(X(-5), Y(0), 650 * s, 15 * s, 'wdp');
    b += R(X(0), Y(40), 640 * s, 40 * s, 'wdp') + R(X(0), Y(680), 640 * s, 40 * s, 'wdp');
    b += R(X(0), Y(640), 30 * s, 600 * s, 'wdp') + R(X(610), Y(640), 30 * s, 600 * s, 'wdp');
    b += balloon(X(60), Y(660), 'B', X(0) - 10, Y(660)) + balloon(X(15), Y(340), 'A', X(0) - 10, Y(340)) + balloon(X(60), Y(20), 'B', X(0) - 10, Y(20));
    b += dimH(X(0), X(640), Y(-15) + 4, '640', Y(-15) + 0.5, Y(-15) + 0.5);
    b += dimH(X(30), X(610), Y(340), T('内宽 580', 'inside 580'));
    b += dimV(Y(0), Y(680), X(640) + 8, '680', X(640) + 0.5, X(640) + 0.5);
    b += dimV(Y(40), Y(640), X(640) + 14, '600', X(640) + 0.5, X(640) + 0.5);
    b += dimV(Y(640), Y(680), X(640) + 20, '40', X(640) + 0.5, X(640) + 0.5);
  }
  { // RIGHT SIDE
    const ox = 172, oy = 88; const X = v => ox + v * s, Y = h => oy - h * s;
    b += Tx(150, 15, T('右侧视（前在左；左侧对称）', 'Right side view (front on the left; left side mirrors it)'), { size: 3, w: 700 });
    b += R(X(0), Y(0), 705 * s, 15 * s, 'wdp');
    b += R(X(30), Y(40), 640 * s, 40 * s, 'wdp') + R(X(30), Y(680), 640 * s, 40 * s, 'wdp');
    [[0, 0], [670, 0], [0, 640], [670, 640]].forEach(([d0, h0]) => { b += R(X(d0), Y(h0 + 40), 30 * s, 40 * s, 'wdp'); });
    b += R(X(0), Y(640), 40 * s, 600 * s, 'wdp') + R(X(660), Y(640), 40 * s, 600 * s, 'wdp');
    b += balloon(X(100), Y(660), 'C', X(0) - 10, Y(660)) + balloon(X(20), Y(340), 'A', X(0) - 10, Y(340)) + balloon(X(100), Y(20), 'C', X(0) - 10, Y(20));
    b += Tx(X(48), Y(600), T('← 前', '← Front'), { size: 2.3, cls: 'mut' });
    b += dimH(X(0), X(700), Y(-15) + 4, '700', Y(-15) + 0.5, Y(-15) + 0.5);
    b += dimH(X(40), X(660), Y(340), T('立柱之间 620', 'between posts 620'));
  }
  { // BACK
    const ox = 40, oy = 172; const X = v => ox + (640 - v) * s, Y = h => oy - h * s;
    b += Tx(15, 101, T('后视（从箱外看）', 'Back view (from outside)'), { size: 3, w: 700 });
    b += R(X(645), Y(0), 650 * s, 15 * s, 'wdp');
    b += R(X(640), Y(40), 640 * s, 40 * s, 'wdp') + R(X(640), Y(680), 640 * s, 40 * s, 'wdp');
    b += R(X(30), Y(640), 30 * s, 600 * s, 'wdp') + R(X(640), Y(640), 30 * s, 600 * s, 'wdp');
    b += balloon(X(580), Y(660), 'B', X(640) - 10, Y(660)) + balloon(X(625), Y(340), 'A', X(640) - 10, Y(340)) + balloon(X(580), Y(20), 'B', X(640) - 10, Y(20));
    b += Circ(X(530), Y(95), 25 * s, 'hid') + Circ(X(115), Y(565), 58 * s, 'hid');
    b += leader(X(115), Y(565), 107, Y(610), T('Ø116 风扇孔（可选）', 'Ø116 fan (optional)'));
    b += leader(X(530), Y(95), 107, Y(130), T('Ø50 过线孔（透明板上）', 'Ø50 grommet (in the panel)'));
  }
  { // TOP
    const ox = 172, oy = 172; const X = v => ox + v * s, Y = dd => oy - dd * s;
    b += Tx(150, 101, T('俯视（前在下）', 'Top view (front at the bottom)'), { size: 3, w: 700 });
    b += R(X(-5), Y(705), 650 * s, 705 * s, 'hid');
    b += R(X(0), Y(30), 640 * s, 30 * s, 'wdp') + R(X(0), Y(700), 640 * s, 30 * s, 'wdp');
    b += R(X(0), Y(670), 30 * s, 640 * s, 'wdp') + R(X(610), Y(670), 30 * s, 640 * s, 'wdp');
    b += balloon(X(60), Y(685), 'B', X(-5) - 10, Y(640)) + balloon(X(15), Y(350), 'C', X(-5) - 10, Y(350)) + balloon(X(60), Y(15), 'B', X(-5) - 10, Y(15));
    b += dimV(Y(0), Y(700), X(640) + 8, '700', X(640) + 0.5, X(640) + 0.5);
    b += dimH(X(30), X(610), Y(350), T('内宽 580', 'inside 580'));
    b += dimV(Y(30), Y(670), X(480), T('内深 640', 'inside 640'));
  }
  b += Ln(145, 12, 145, 178, 'hid') + Ln(12, 97, 287, 97, 'hid');
  b += para(150, 180, note, 34, 2.1, 1.4).svg;
  return sheet(3, T('框架装配三视图', 'Frame assembly views'), '1:10', b);
}

function pSheet4() {
  let b = Tx(12, 15, T('门框 正视（从箱外看，比例 1:6）', 'Door frame, front view (from outside, scale 1:6)'), { size: 3.4, w: 700 });
  const s = 1 / 6, ox = 26, oy = 150;
  const X = v => ox + v * s, Y = h => oy - h * s;
  b += R(X(0), Y(683), 40 * s, 683 * s, 'wdp') + R(X(606), Y(683), 40 * s, 683 * s, 'wdp');
  b += R(X(40), Y(40), 566 * s, 40 * s, 'wdp') + R(X(40), Y(683), 566 * s, 40 * s, 'wdp');
  [112, 262, 418, 568].forEach(h => { b += Circ(X(622), Y(h), 6 * s + 0.2, 'hid'); });
  [90, 341.5, 593].forEach(h => { b += R(X(-3), Y(h + 25), 3 * s, 50 * s, 'steel'); });
  b += tag(X(20), Y(400), 'D') + tag(X(626), Y(330), 'D') + tag(X(323), Y(20), 'E') + tag(X(323), Y(663), 'E');
  b += leader(X(622), Y(568), X(646) + 8, Y(610), T('磁铁槽（背面）', 'Magnets (back)'));
  b += leader(X(-1.5), Y(593), X(0) - 4, Y(640), T('合页', 'Hinges'), 'end');
  b += Tx(X(323), Y(340), T('门板 646×683 盖满整个门框正面', 'Door panel 646×683 covers the whole front'), { size: 2.3, a: 'middle', cls: 'mut' });
  b += dimH(X(0), X(646), Y(683) - 6, '646', Y(683) - 0.5, Y(683) - 0.5);
  b += dimH(X(40), X(606), Y(0) + 6, '566', Y(40), Y(40));
  b += dimH(X(0), X(40), Y(0) + 11, '40', Y(0) + 0.5, Y(0) + 0.5);
  b += dimV(Y(0), Y(683), X(646) + 6, '683', X(646) + 0.5, X(646) + 0.5);
  b += para(12, 172, T('竖梃 D 通长，横档 E 夹在中间；每角白乳胶 + 2 颗 4×60（从竖梃外侧打入横档端面）。装上门板后门框就会保持方正。磁铁槽、合页自己做。', 'Stiles D run full height with rails E between them; glue each corner and drive two 4×60 screws through the stile into the rail end. The panel keeps the door square once fitted. Magnet pockets and hinges are DIY.'), 110, 2.2, 1.45).svg;

  // detail 1: panel fixing section (H to the right, X down into the frame)
  b += Tx(150, 15, T('节点 1：透明板固定（比例 2:1）', 'Detail 1: panel fixing (scale 2:1)'), { size: 3.2, w: 700 });
  const dx = 166, dy = 40, d = 2;
  const P = (h, xx) => [dx + h * d, dy + xx * d];
  b += R(...P(0, 0), 40 * d, 26 * d, 'wd');
  b += Ln(...P(-1, 26), ...P(41, 26), 'hid');
  b += R(...P(10, -3), 10 * d, 3 * d, 'foam');
  b += R(...P(0, -6), 55 * d, 3 * d, 'panS');
  b += R(...P(12, -6), 6 * d, 3 * d, 'of');
  b += R(...P(9, -7), 12 * d, 1 * d, 'washer');
  b += R(...P(11, -9.5), 8 * d, 2.5 * d, 'steel');
  b += R(...P(13, -7), 4 * d, 20 * d, 'steel');
  b += Ln(...P(55, -7), ...P(55, -2), 't');
  b += leader(...P(15, -8.5), P(15, -8.5)[0] + 30, P(15, -8.5)[1] - 6, T('ST4×20 盘头螺丝 + 尼龙垫圈 4.3×12', 'ST4×20 pan-head screw + nylon washer 4.3×12'));
  b += leader(...P(40, -4.5), P(40, -4.5)[0] + 16, P(40, -4.5)[1] + 4, T('透明板 3 mm，Ø6 孔', '3 mm panel, Ø6 hole'));
  b += leader(...P(19, -1.5), P(19, -1.5)[0] + 37, P(19, -1.5)[1] + 15, T('泡棉条 3×10', 'Foam tape 3×10'));
  b += leader(...P(30, 15), P(30, 15)[0] + 26, P(30, 15)[1] + 10, T('木框（任一根木方）', 'Frame (any strip)'));
  b += dimH(P(0, 0)[0], P(15, 0)[0], P(0, 26)[1] + 5, '15', P(0, 26)[1] + 0.5, P(15, 26)[1] + 0.5);
  b += dimV(P(0, -6)[1], P(0, -3)[1], P(0, 0)[0] - 4, '3', P(0, 0)[0] - 0.5, P(0, 0)[0] - 0.5, { ty: P(0, -4.5)[1] });
  b += dimV(P(0, -3)[1], P(0, 0)[1], P(0, 0)[0] - 9, '3', P(0, 0)[0] - 0.5, P(0, 0)[0] - 0.5, { ty: P(0, -1.5)[1] });
  b += para(150, 108, T('孔 Ø6 比螺丝大 2 mm，给板材热胀留余量。拧到垫圈贴紧即停，再回拧 1/4 圈；从每条边中间往两端拧。', 'The Ø6 hole is 2 mm larger than the screw so the panel can expand. Stop when the washer seats, then back off a quarter turn; work from the middle of each edge outward.'), 134, 2.2, 1.45).svg;

  // detail 2: frame corner (plan of the bottom frame, front-left)
  b += Tx(150, 126, T('节点 2：框角（底框左前角俯视，1:2）', 'Detail 2: frame corner (bottom frame, front-left, plan 1:2)'), { size: 3.2, w: 700 });
  const cx = 170, cy = 172, c = 0.5;
  const Q = (xx, dd) => [cx + xx * c, cy - dd * c];
  b += R(...Q(0, 30), 90 * c, 30 * c, 'wdp');
  b += R(...Q(0, 90), 30 * c, 60 * c, 'wdp');
  b += R(...Q(0, 40), 30 * c, 40 * c, 'hid');
  [10, 20].forEach(xx => { b += Ln(...Q(xx, -4), ...Q(xx, 50), 'hid'); b += Poly([Q(xx - 1.4, -7), Q(xx + 1.4, -7), Q(xx, -2)], 'dot'); });
  b += Tx(...Q(45, 15), 'B', { size: 2.6, w: 700, a: 'middle' }) + Tx(...Q(15, 70), 'C', { size: 2.6, w: 700, a: 'middle' });
  b += para(cx + 52, cy - 40, T('前后梁 B 通长；侧梁 C 顶在 B 内侧，从 B 正面打 2 颗 4×50 进 C 端面。虚线 = 立柱 A 位置：从下方打 2 颗 4×60 进立柱端面，内侧加 L 角码。顶框同理。', 'Rail B runs through; side rail C butts against its inside face, fixed with two 4×50 screws through B into the end of C. Dashed = post A: two 4×60 screws from below into its end, plus an L bracket inside. The top frame is the same.'), 64, 2.2, 1.45).svg;
  return sheet(4, T('门框与安装节点', 'Door frame and fixing details'), '1:6 / 2:1 / 1:2', b);
}

function pSheet5() {
  let b = Tx(12, 15, T('透明板与开孔（比例约 1:11，从箱外看）', 'Clear panels and holes (about 1:11, seen from outside)'), { size: 3.4, w: 700 });
  const s = 0.09;
  let x = 18;
  const rows = [];
  PANELS_PURE().forEach(p => {
    const y = 28;
    const eh = edgeHoles(p.w, p.h);
    b += Tx(x, 24, `${p.id} ${p.name} ×${p.qty}`, { size: 2.6, w: 700 });
    b += R(x, y, p.w * s, p.h * s, 'panS');
    eh.pts.forEach(([hx, hy]) => { b += Circ(x + hx * s, y + hy * s, 0.55, 'o'); });
    p.holes.forEach(hh => {
      b += Circ(x + hh.x * s, y + hh.y * s, hh.d / 2 * s, hh.opt ? 'hid' : 'o');
      b += Ln(x + hh.x * s - 1.3, y + hh.y * s, x + hh.x * s + 1.3, y + hh.y * s, 't') + Ln(x + hh.x * s, y + hh.y * s - 1.3, x + hh.x * s, y + hh.y * s + 1.3, 't');
    });
    b += dimH(x, x + p.w * s, y + p.h * s + 4.5, String(p.w), y + p.h * s + 0.5, y + p.h * s + 0.5);
    b += dimV(y, y + p.h * s, x - 3.2, String(p.h), x - 0.5, x - 0.5);
    rows.push([p.id, `${p.w}×${p.h}`, String(p.qty), `${fmt(eh.px)} / ${fmt(eh.py)}`]);
    x += p.w * s + 8;
  });
  const t = table(12, 104, [{ w: 14, title: T('板', 'Panel') }, { w: 28, title: T('尺寸', 'Size'), a: 'end' }, { w: 12, title: T('数量', 'Qty'), a: 'middle' }, { w: 44, title: T('孔距（横 / 竖）', 'Pitch (across / up)') }], rows, { rh: 6.2 });
  b += t.svg;
  const t2 = table(116, 104, [{ w: 14, title: T('板', 'Panel') }, { w: 40, title: T('开孔', 'Hole') }, { w: 108, title: T('位置（到孔中心，从箱外看）', 'Position (to hole centre, seen from outside)') }], [
    ['P2', T('Ø50 过线孔', 'Ø50 grommet hole'), T('距左边 113，距下边 95', '113 from the left edge, 95 from the bottom')],
    ['P2', T('Ø116 风扇孔（可选）', 'Ø116 fan hole (optional)'), T('距右边 118，距上边 115', '118 from the right edge, 115 from the top')],
    ['P3', T('Ø50 过线孔', 'Ø50 grommet hole'), T('距右边 103，距上（后）边 113', '103 from the right, 113 from the top (rear) edge')]
  ], { rh: 6.2 });
  b += t2.svg;
  const notes = [
    T('每块板四边各 5 孔（四角共用，共 16 孔），孔径 Ø6，孔中心距边 15。可让板材店代钻。', 'Each panel: 5 holes per edge (corners shared, 16 in all), Ø6, centres 15 from the edge. The panel shop can drill them.'),
    T('材料：3 mm 浇铸亚克力或实心 PC 耐力板（门板建议耐力板），不要中空阳光板。尺寸公差 ±0.5，边缘抛光，保留保护膜。', 'Material: 3 mm cast acrylic or solid polycarbonate (solid PC for the door), not twin-wall PC. Size tolerance ±0.5, polished edges, film left on.'),
    T('侧板盖住立柱侧面，后板盖住侧板后沿，顶板盖住侧板和后板上沿。过线孔位置可按 A1 电源口现场微调；拉手孔拿到拉手后再开。', 'Side panels cover the post sides, the back panel covers the side panels\' rear edges, the top covers both. Grommet positions can be adjusted to the A1 power socket; drill the handle holes once you have the handle.')
  ];
  let y = 104 + Math.max(t.h, t2.h) + 7;
  notes.forEach(n => { const pr = para(12, y, '· ' + n, 170, 2.4, 1.5); b += pr.svg; y += pr.h + 1; });
  return sheet(5, T('透明板与开孔', 'Clear panels and holes'), '≈1:11', b);
}

/* ---------- 3D render for the cover ---------- */
async function render3D(browser, mount) {
  const pg = await browser.newPage({ viewport: { width: 1600, height: 1060 }, deviceScaleFactor: 2, colorScheme: 'light', locale: 'zh-CN' });
  await pg.goto('file://' + path.join(ROOT, 'docs', 'index.html'));
  await pg.waitForFunction(() => window.THREE !== undefined);
  await pg.waitForTimeout(1500);
  await pg.click(`[data-mount="${mount}"]`);
  for (const id of ['#ly-printer', '#ly-dims', '#anim', '#ly-foam']) { if (await pg.isChecked(id)) await pg.click(id); }
  await pg.addStyleTag({ content: ':root{--scene:#ffffff !important;--floor:#f3f3f1 !important}.ttl,.views,.hint,.labels,.card{display:none !important}' });
  await pg.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
  await pg.evaluate(() => { const e = document.querySelector('#door'); e.value = 60; e.dispatchEvent(new Event('input')); });
  await pg.waitForTimeout(2200);
  // crop to the enclosure (canvas sits at the page origin)
  const buf = await pg.screenshot({ clip: { x: 0, y: 180, width: 820, height: 700 } });
  await pg.close();
  return 'data:image/png;base64,' + buf.toString('base64');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const imgs = { pure: await render3D(browser, 'screw'), rebate: await render3D(browser, 'rebate') };
  for (const v of ['pure', 'rebate']) for (const l of ['zh', 'en']) {
    lang = l; variant = v;
    const img = imgs[v];
    const pages = v === 'pure'
      ? pSheet1(img) + pSheet2() + pSheet3() + pSheet4() + pSheet5()
      : sheet1(img) + sheet2() + sheet3() + sheet4() + sheet5() + sheet6() + sheet7() + sheet8();
    const html = `<!doctype html><html lang="${l === 'zh' ? 'zh-CN' : 'en'}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap">
<style>${CSS}</style></head><body>
${pages}
</body></html>`;
    if (process.env.KEEP_HTML) fs.writeFileSync(path.join(OUT, `drawings-${v}-${l}.html`), html);
    const pg = await browser.newPage();
    await pg.setContent(html, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, v === 'pure' ? `A1-enclosure-drawings-${l}.pdf` : `A1-enclosure-drawings-rebate-${l}.pdf`);
    await pg.pdf({ path: file, width: '297mm', height: '210mm', printBackground: true });
    await pg.close();
    console.log('wrote', path.relative(ROOT, file));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
