// Builds the assembly manual (A4 landscape PDF, Chinese + English).
// Run from the repo root:  node drawings/manual.js
// Needs Playwright with Chromium. Step pictures are rendered from docs/index.html.
// Output: docs/drawings/A1-enclosure-manual-zh.pdf / -en.pdf
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'drawings');
const DATE = '2026-11-20';

let lang = 'zh';
const T = (zh, en) => (lang === 'zh' ? zh : en);

/* ---------- svg helpers ---------- */
const f = n => +(+n).toFixed(2);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const R = (x, y, w, h, cls = 'o') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" class="${cls}"/>`;
const RR = (x, y, w, h, r, cls) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" class="${cls}"/>`;
const Ln = (x1, y1, x2, y2, cls = 't') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${cls}"/>`;
const Circ = (x, y, r, cls = 'o') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="${cls}"/>`;
function Tx(x, y, s, o = {}) {
  const { size = 2.6, a = 'start', w = 400, cls = '', rot = 0 } = o;
  const tr = rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : '';
  return `<text x="${f(x)}" y="${f(y)}" font-size="${size}" text-anchor="${a}" font-weight="${w}" class="${cls}"${tr}>${esc(s)}</text>`;
}
function wrap(text, maxW, size) {
  const cw = ch => (/[⺀-￿]/.test(ch) ? size * 1.03 : size * 0.53);
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
function para(x, y, text, maxW, size = 2.6, lh = 1.5, o = {}) {
  const lines = wrap(text, maxW, size);
  return { svg: lines.map((l, i) => Tx(x, y + i * size * lh, l, { size, ...o })).join(''), h: lines.length * size * lh };
}
function dimH(x1, x2, y, label, e1, e2) {
  let s = '';
  if (e1 != null) s += Ln(x1, e1, x1, y + (y > e1 ? 1.2 : -1.2), 'dim');
  if (e2 != null) s += Ln(x2, e2, x2, y + (y > e2 ? 1.2 : -1.2), 'dim');
  s += `<line x1="${f(x1)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y)}" class="dim" marker-start="url(#ar)" marker-end="url(#ar)"/>`;
  return s + Tx((x1 + x2) / 2, y - 0.8, label, { size: 2.2, a: 'middle' });
}
function dimV(y1, y2, x, label, e1, e2) {
  let s = '';
  if (e1 != null) s += Ln(e1, y1, x + (x > e1 ? 1.2 : -1.2), y1, 'dim');
  if (e2 != null) s += Ln(e2, y2, x + (x > e2 ? 1.2 : -1.2), y2, 'dim');
  s += `<line x1="${f(x)}" y1="${f(y1)}" x2="${f(x)}" y2="${f(y2)}" class="dim" marker-start="url(#ar)" marker-end="url(#ar)"/>`;
  return s + Tx(x - 0.8, (y1 + y2) / 2, label, { size: 2.2, a: 'middle', rot: -90 });
}
function leader(x, y, tx, ty, label, a = 'start') {
  return Ln(x, y, tx, ty, 'lead') + Circ(x, y, 0.45, 'dot') + Tx(tx + (a === 'end' ? -1 : 1), ty + 0.9, label, { size: 2.3, a });
}

const DEFS = `<defs>
<marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="2" markerHeight="2" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1.8 L10,5 L0,8.2 z" fill="#222"/></marker>
<pattern id="wood" patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform="rotate(-35)"><rect width="2.4" height="2.4" fill="#f6ead6"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#d8bf96" stroke-width="0.18"/></pattern>
</defs>`;
const CSS = `
@page { size: 297mm 210mm; margin: 0 }
* { margin: 0; padding: 0 }
body { font-family: 'Noto Sans SC', 'WenQuanYi Zen Hei', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
section.pg { width: 297mm; height: 210mm; page-break-after: always; overflow: hidden; }
svg { display: block; overflow: hidden }
text { fill: #17201b; font-variant-numeric: tabular-nums }
text.mut { fill: #56655e } text.inv { fill: #fff } text.acc { fill: #2b6a54 } text.warn { fill: #8a5208 }
.o { fill: none; stroke: #17201b; stroke-width: 0.3 }
.of { fill: #fff; stroke: #17201b; stroke-width: 0.3 }
.t { fill: none; stroke: #17201b; stroke-width: 0.18 }
.hid { fill: none; stroke: #333; stroke-width: 0.2; stroke-dasharray: 1.2 0.8 }
.dim { fill: none; stroke: #222; stroke-width: 0.13 }
.lead { fill: none; stroke: #222; stroke-width: 0.15 }
.dot { fill: #222 }
.wd { fill: url(#wood); stroke: #17201b; stroke-width: 0.3 }
.wdp { fill: #f6ead6; stroke: #17201b; stroke-width: 0.3 }
.panS { fill: #d9ecf7; stroke: #2f7fb5; stroke-width: 0.25 }
.cav { fill: #f6fbff; stroke: #2f7fb5; stroke-width: 0.12 }
.foamo { fill: none; stroke: #444; stroke-width: 0.25; stroke-dasharray: 0.8 0.5 }
.steel { fill: #b9c0c6; stroke: #333; stroke-width: 0.2 }
.washer { fill: #f4f1e6; stroke: #333; stroke-width: 0.2 }
.tape { fill: #c9ced3; stroke: #888; stroke-width: 0.15 }
.badge { fill: #2b6a54 }
.band { fill: #eef3f0 }
.rule { fill: none; stroke: #c6cfca; stroke-width: 0.3 }
.note { fill: #fbf3e4; stroke: #e2c58f; stroke-width: 0.3 }
.thead { fill: #efe7da }
.box { fill: #fff; stroke: #2b6a54; stroke-width: 0.35 }
.chk { fill: #fff; stroke: #17201b; stroke-width: 0.3 }
`;

/* ---------- BOM from the CSVs ---------- */
function loadBOM(file) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').trim().split('\n').slice(1);
  return lines.map(l => {
    const [cat, id, name, spec, qty, unit, ...rest] = l.split(',');
    return { cat, id, name, spec, qty, unit, note: rest.join(',') };
  });
}
let BOM = [];
const byId = id => BOM.find(r => r.id === id);
const nameOf = id => (byId(id) ? byId(id).name : id);

/* ---------- page frame ---------- */
let pageNo = 0, total = 0;
function page(body) {
  pageNo++;
  const foot = Ln(10, 200, 287, 200, 'rule') +
    Tx(10, 204.5, T('拓竹 A1 木框封箱 · 组装说明书', 'Bambu Lab A1 Wooden Enclosure · Assembly Manual'), { size: 2.3, cls: 'mut' }) +
    Tx(287, 204.5, `${pageNo} / ${total}`, { size: 2.3, cls: 'mut', a: 'end' });
  return `<section class="pg"><svg viewBox="0 0 297 210" width="297mm" height="210mm" xmlns="http://www.w3.org/2000/svg">${DEFS}${body}${foot}</svg></section>`;
}
function heading(num, title, sub) {
  let s = '';
  if (num != null) {
    s += Circ(20, 17, 7, 'badge') + Tx(20, 19.6, String(num), { size: 7, a: 'middle', w: 700, cls: 'inv' });
    s += Tx(31, 17.5, title, { size: 6, w: 700 });
    if (sub) s += Tx(31, 24, sub, { size: 3, cls: 'mut' });
  } else {
    s += Tx(12, 18, title, { size: 6.5, w: 700 });
    if (sub) s += Tx(12, 25, sub, { size: 3, cls: 'mut' });
  }
  return s;
}
function img(src, x, y, w, h) {
  return `<image href="${src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
}

/* right column: parts, actions, notes */
function rightColumn(x, y, w, parts, ops, notes) {
  let s = '', cy = y;
  if (parts && parts.length) {
    s += Tx(x, cy, T('本步用料', 'Parts for this step'), { size: 3.2, w: 700 }); cy += 2.5;
    const rh = 5.2;
    s += R(x, cy, w, rh, 'thead');
    s += Tx(x + 1.5, cy + 3.6, T('编号', 'ID'), { size: 2.3, w: 700 }) + Tx(x + 13, cy + 3.6, T('名称', 'Part'), { size: 2.3, w: 700 }) + Tx(x + w - 1.5, cy + 3.6, T('数量', 'Qty'), { size: 2.3, w: 700, a: 'end' });
    parts.forEach(([id, qty, label], i) => {
      const yy = cy + rh * (i + 1);
      const r = byId(id);
      const name = label || (r ? `${r.name} ${/^[A-F]$/.test(id) || /^P\d/.test(id) ? r.spec.replace(/^.*?(\d+×\d+(×\d+)?)$/, '$1') : r.spec}` : id);
      s += Ln(x, yy, x + w, yy, 't');
      s += Tx(x + 1.5, yy + 3.6, id, { size: 2.3, w: 700, cls: 'acc' }) + Tx(x + 13, yy + 3.6, name, { size: 2.3 }) + Tx(x + w - 1.5, yy + 3.6, String(qty), { size: 2.3, a: 'end' });
    });
    s += R(x, cy, w, rh * (parts.length + 1), 'o');
    cy += rh * (parts.length + 1) + 7;
  }
  s += Tx(x, cy, T('操作', 'Steps'), { size: 3.2, w: 700 }); cy += 5;
  ops.forEach((o, i) => {
    s += Circ(x + 2, cy - 0.9, 2, 'badge') + Tx(x + 2, cy + 0.1, String(i + 1), { size: 2.3, a: 'middle', w: 700, cls: 'inv' });
    const pr = para(x + 6, cy, o, w - 6, 2.5, 1.42); s += pr.svg; cy += pr.h + 1.6;
  });
  if (notes && notes.length) {
    cy += 1.5;
    const lines = notes.map(n => wrap(n, w - 8, 2.35));
    const hgt = lines.reduce((a, l) => a + l.length * 2.35 * 1.42 + 1.2, 0) + 7;
    s += RR(x, cy, w, hgt, 1.5, 'note');
    s += Tx(x + 3, cy + 4.5, T('注意', 'Watch out'), { size: 2.6, w: 700, cls: 'warn' });
    let ny = cy + 9;
    lines.forEach(l => { l.forEach((t, i) => { s += Tx(x + 3 + (i ? 2.2 : 0), ny, (i ? '' : '· ') + t, { size: 2.35 }); ny += 2.35 * 1.42; }); ny += 1.2; });
    cy += hgt;
  }
  if (cy > 197) console.warn(`  ! page ${pageNo + 1}: right column overflows to y=${cy.toFixed(1)}`);
  return s;
}
function stepPage({ num, title, sub, pic, cap, art, detail, detailTitle, parts, ops, notes }) {
  let b = heading(num, title, sub);
  const imgH = detail ? 108 : 160;
  if (pic) b += R(10, 30, 150, imgH, 'rule') + img(pic, 11, 31, 148, imgH - 2);
  if (art) b += art;
  if (cap) b += Tx(10, 30 + imgH + 4, cap, { size: 2.2, cls: 'mut' });
  if (detail) {
    const dy = 30 + imgH + 8;
    if (detailTitle) b += Tx(10, dy + 2, detailTitle, { size: 2.8, w: 700 });
    b += detail(10, dy + 5);
  }
  b += rightColumn(168, 34, 119, parts, ops, notes);
  return page(b);
}

/* ---------- small technical sketches ---------- */
// P1 and P2 with holes, channels and the "outside" mark
function artPanels(x0, y0) {
  let s = '';
  const sc = 0.088;
  const panel = (x, y, w, h, title, extra) => {
    let g = Tx(x, y - 2.5, title, { size: 2.6, w: 700 });
    g += R(x, y, w * sc, h * sc, 'panS');
    g += R(x, y, w * sc, 1.4, 'tape') + R(x, y + h * sc - 1.4, w * sc, 1.4, 'tape');
    const sp = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
    const xs = sp(15, w - 15, Math.ceil((w - 30) / 175)), ys = sp(15, h - 15, Math.ceil((h - 30) / 175));
    xs.forEach(px => { g += Circ(x + px * sc, y + 15 * sc, 0.55, 'o') + Circ(x + px * sc, y + (h - 15) * sc, 0.55, 'o'); });
    ys.slice(1, -1).forEach(py => { g += Circ(x + 15 * sc, y + py * sc, 0.55, 'o') + Circ(x + (w - 15) * sc, y + py * sc, 0.55, 'o'); });
    const ax = x + w * sc / 2;
    g += `<line x1="${f(ax)}" y1="${f(y + h * sc * 0.3)}" x2="${f(ax)}" y2="${f(y + h * sc * 0.55)}" class="dim" marker-start="url(#ar)" marker-end="url(#ar)"/>`;
    g += Tx(ax + 1.5, y + h * sc * 0.43, T('孔道', 'channels'), { size: 2.1, cls: 'mut' });
    g += Tx(x + w * sc * 0.5, y + h * sc * 0.72, T('外', 'OUT'), { size: 5, a: 'middle', w: 700, cls: 'acc' });
    g += dimH(x, x + w * sc, y + h * sc + 4, String(w), y + h * sc + 0.4, y + h * sc + 0.4);
    g += dimV(y, y + h * sc, x - 3, String(h), x - 0.4, x - 0.4);
    return g + (extra || '');
  };
  s += panel(x0 + 5, y0 + 8, 700, 680, T('P1 侧板 ×2', 'P1 side panel ×2'));
  const p2x = x0 + 5 + 700 * sc + 12, p2y = y0 + 8;
  s += panel(p2x, p2y, 646, 680, T('P2 后板 ×1', 'P2 back panel ×1'),
    Circ(p2x + 113 * sc, p2y + (680 - 95) * sc, 25 * sc, 'o') + Tx(p2x + 113 * sc + 3.5, p2y + (680 - 95) * sc + 0.8, 'Ø50', { size: 2.1 }));
  // zoom: corner hole position
  const zx = x0 + 18, zy = y0 + 98, z = 1.0;
  s += Tx(x0 + 5, zy - 9, T('孔位（每个角都一样）', 'Hole position (same at every corner)'), { size: 2.6, w: 700 });
  s += R(zx, zy, 40 * z, 30 * z, 'panS') + Circ(zx + 15 * z, zy + 15 * z, 3 * z, 'of');
  s += dimH(zx, zx + 15 * z, zy - 2, '15', zy - 0.3, zy - 0.3) + dimV(zy, zy + 15 * z, zx - 3, '15', zx - 0.3, zx - 0.3);
  s += Tx(zx + 15 * z + 5, zy + 15 * z + 1, 'Ø6', { size: 2.4, w: 700 });
  s += R(zx + 60, zy + 2, 8, 2, 'tape') + Tx(zx + 70, zy + 3.8, T('灰色 = 铝箔胶带封边（可选）', 'Grey = foil tape on the open edges (optional)'), { size: 2.2, cls: 'mut' });
  s += Tx(zx + 60, zy + 11, T('孔距见右侧「操作 2」', 'Pitch: see step 2 on the right'), { size: 2.2, cls: 'mut' });
  return s;
}
// frame corner plan
function detailCorner(x0, y0) {
  const c = 0.45, cx = x0 + 6, cy = y0 + 37;
  const Q = (xx, dd) => [cx + xx * c, cy - dd * c];
  let s = R(...Q(0, 30), 90 * c, 30 * c, 'wdp') + R(...Q(0, 75), 30 * c, 45 * c, 'wdp') + R(...Q(0, 40), 30 * c, 40 * c, 'hid');
  [10, 20].forEach(xx => { s += Ln(...Q(xx, -3), ...Q(xx, 50), 'hid'); });
  s += Tx(...Q(55, 12), 'B', { size: 2.6, w: 700, a: 'middle' }) + Tx(...Q(15, 62), 'C', { size: 2.6, w: 700, a: 'middle' });
  s += para(x0 + 62, y0 + 6, T('B 通长；C 顶在 B 内侧。从 B 外面打 2 颗 4×60 进 C 的端面，接缝上白乳胶。虚线方块是之后立柱 A 的位置。', 'B runs through; C butts against its inside face. Two 4×60 screws through B into the end of C, glue in the joint. The dashed square is where post A goes later.'), 86, 2.3, 1.45).svg;
  return s;
}
// diagonal check
function detailDiag(x0, y0) {
  let s = R(x0 + 6, y0 + 4, 48, 34, 'wdp') + R(x0 + 10, y0 + 8, 40, 26, 'of');
  s += Ln(x0 + 6, y0 + 4, x0 + 54, y0 + 38, 'dim') + Ln(x0 + 54, y0 + 4, x0 + 6, y0 + 38, 'dim');
  s += Tx(x0 + 20, y0 + 16, 'a', { size: 3, w: 700, cls: 'acc' }) + Tx(x0 + 39, y0 + 16, 'b', { size: 3, w: 700, cls: 'acc' });
  s += para(x0 + 62, y0 + 8, T('用卷尺量两条对角线 a 和 b，相差不超过 2 mm 就是方的。差得多就推长的那条对角，再拧紧。前面、侧面、顶面都量一次。', 'Measure both diagonals a and b; within 2 mm means square. If not, push along the longer diagonal, then tighten. Check the front, side and top.'), 86, 2.3, 1.45).svg;
  return s;
}
// panel fixing section
function detailFix(x0, y0) {
  const d = 0.95, dx = x0 + 8, dy = y0 + 12;
  const P = (h, xx) => [dx + h * d, dy + xx * d];
  let s = R(...P(0, 0), 40 * d, 24 * d, 'wd');
  s += R(...P(0, -2), 55 * d, 2 * d, 'panS');
  s += R(...P(12, -2), 6 * d, 2 * d, 'of');
  s += R(...P(6, -3.6), 18 * d, 1.6 * d, 'washer') + R(...P(11, -6.2), 8 * d, 2.6 * d, 'steel') + R(...P(13, -3.6), 4 * d, 25 * d, 'steel');
  s += leader(...P(16, -5), dx + 72, dy - 9, T('4×25 盘头自攻螺丝 + M6 加大垫圈', '4×25 pan-head screw + M6 large washer'));
  s += leader(...P(45, -1), dx + 72, dy - 2, T('阳光板，Ø6 孔', 'Twin-wall sheet, Ø6 hole'));
  s += leader(...P(30, 12), dx + 72, dy + 8, T('木框（任一根木方）', 'Frame (any strip)'));
  s += dimH(P(0, 0)[0], P(15, 0)[0], P(0, 24)[1] + 4, '15', P(0, 24)[1] + 0.4, P(15, 24)[1] + 0.4);
  s += para(dx + 72, dy + 15, T('孔比螺丝大 2 mm，留热胀余量。拧到垫圈刚贴紧就停，再回拧 1/4 圈。', 'The hole is 2 mm larger than the screw for expansion. Stop when the washer seats, then back off a quarter turn.'), 70, 2.2, 1.45).svg;
  return s;
}
// hinge and latch plan view (from above)
function detailDoorPlan(x0, y0) {
  const k = 0.42;
  let s = '';
  const corner = (ox, oy, mirror, label) => {
    const X = v => ox + (mirror ? -v : v) * k, Y = d => oy - d * k;   // d = depth from frame front, + is backwards
    const rect = (x1, x2, d1, d2, cls) => R(Math.min(X(x1), X(x2)), Math.min(Y(d1), Y(d2)), Math.abs(X(x2) - X(x1)), Math.abs(Y(d2) - Y(d1)), cls);
    let g = rect(0, 30, 0, 40, 'wdp');                 // post
    g += rect(-2, 0, 0, 60, 'panS');                    // side panel
    g += rect(-3, 40, -30, 0, 'wdp');                   // door stile
    g += rect(-3, 80, -32, -30, 'panS');                // door panel
    if (!mirror) {                                      // hinge: two leaves on the left side plane, pin at the corner
      g += rect(-4.5, -3, -19, 0, 'steel') + rect(-4.5, -2, 0, 19, 'steel');
      g += Circ(X(-3.5), Y(0), 1.6 * k + 0.4, 'steel');
    } else {                                            // latch: body on the side panel, hook on the door edge
      g += rect(-8, -2, 4, 24, 'steel') + rect(-7, -3, -22, -8, 'steel') + rect(-10, -8, -18, 16, 'steel');
    }
    g += Tx(X(15), Y(20) + 1, 'A', { size: 2.4, w: 700, a: 'middle' });
    g += Tx(X(20), Y(-15) + 1, 'D', { size: 2.4, w: 700, a: 'middle' });
    g += Tx(mirror ? X(40) : X(40), Y(70), label, { size: 2.4, w: 700, a: mirror ? 'end' : 'start' });
    return g;
  };
  s += corner(x0 + 20, y0 + 30, false, T('左前角：合页', 'Front-left: hinge'));
  s += corner(x0 + 135, y0 + 30, true, T('右前角：搭扣', 'Front-right: latch'));
  s += Tx(x0 + 78, y0 + 40, T('↓ 前（门）', '↓ Front (door)'), { size: 2.2, cls: 'mut', a: 'middle' });
  s += para(x0 + 60, y0 + 8, T('俯视图。合页和搭扣都装在侧面：门的侧边和侧板外面在同一个平面上。', 'Plan view. Hinges and latches both sit on the side faces: the door edge and the side panel are in one plane.'), 36, 2.2, 1.45).svg;
  return s;
}

/* ---------- pages ---------- */
function cover(pic) {
  let b = Tx(12, 24, T('拓竹 A1 木框封箱', 'Bambu Lab A1 Wooden Enclosure'), { size: 9, w: 700 });
  b += Tx(12, 33, T('组装说明书 · 外置供料 · 纯木方 + 阳光板', 'Assembly manual · external feed · plain strips + twin-wall panels'), { size: 3.8, cls: 'mut' });
  b += img(pic, 10, 40, 160, 150);
  let y = 48; const x = 180, w = 105;
  const facts = [
    [T('外框', 'Frame'), '640 × 700 × 680 mm'],
    [T('内部空间', 'Inside'), '580 × 640 × 640 mm'],
    [T('成品外形', 'Finished size'), T('约 650 × 741 × 708 mm', 'about 650 × 741 × 708 mm')],
    [T('木料', 'Timber'), T('30×40 木方 16 根 + 底板', '16 strips 30×40 + base board')],
    [T('板材', 'Panels'), T('2–4 mm 透明阳光板 5 块', '5 clear twin-wall PC sheets, 2–4 mm')],
    [T('固定', 'Fixing'), T('白乳胶 + 螺丝 + 合页 + 搭扣', 'PVA glue + screws + hinges + latches')],
    [T('用时', 'Time'), T('约 4–6 小时（不含等胶干）', 'about 4–6 hours (plus glue drying)')]
  ];
  facts.forEach(([k, v]) => { b += Tx(x, y, k, { size: 2.6, cls: 'mut' }) + Tx(x + 24, y, v, { size: 2.8, w: 600 }); y += 6.2; });
  y += 4;
  b += Tx(x, y, T('目录', 'Contents'), { size: 3.4, w: 700 }); y += 6;
  const toc = [
    [T('零件清点', 'Parts check'), 2], [T('工具与准备', 'Tools and preparation'), 3],
    [T('1 阳光板钻孔', '1 Drill the panels'), 4], [T('2 拼底框', '2 Bottom frame'), 5], [T('3 装立柱', '3 Posts'), 6],
    [T('4 顶框与底板', '4 Top frame and base'), 7], [T('5 侧板与后板', '5 Side and back panels'), 8], [T('6 顶板', '6 Top panel'), 9],
    [T('7 门框与门板', '7 Door'), 10], [T('8 合页与搭扣', '8 Hinges and latches'), 11], [T('9 放入 A1 与走线', '9 Fit the A1 and cables'), 12],
    [T('使用与维护', 'Use and care'), 13]
  ];
  toc.forEach(([t, p]) => { b += Tx(x, y, t, { size: 2.6 }) + Ln(x + 52, y - 0.8, x + w - 8, y - 0.8, 'hid') + Tx(x + w, y, String(p), { size: 2.6, a: 'end' }); y += 5.2; });
  y += 3;
  b += RR(x, y, w, 18, 1.5, 'note');
  b += para(x + 3, y + 5, T('拓竹官方不推荐给 A1 加封箱。这个箱子用来防尘、降噪、挡风。打 PLA 时箱内保持 35 °C 以下，太热就开门缝或加排风扇。', 'Bambu Lab does not recommend enclosing the A1. This box is for dust, noise and drafts. For PLA keep it below 35 °C inside; open the door a crack or add a fan if it gets warmer.'), w - 6, 2.3, 1.45).svg;
  return page(b);
}

function inventory() {
  let b = heading(null, T('零件清点', 'Parts check'), T('开工前对照清单逐项打勾。木料按编号用铅笔写在木方上。', 'Tick each item before you start. Pencil the letter on every strip.'));
  const req = BOM.filter(r => !/^(可选|Optional)$/.test(r.cat));
  const opt = BOM.filter(r => /^(可选|Optional)$/.test(r.cat));
  const col = (x, y, title, rows) => {
    let s = Tx(x, y, title, { size: 3.4, w: 700 }); y += 3;
    const rh = 5.6, w = [6, 11, 50, 46, 18], tw = w.reduce((a, c) => a + c, 0);
    s += R(x, y, tw, rh, 'thead');
    const hd = ['', T('编号', 'ID'), T('名称', 'Part'), T('规格', 'Spec'), T('数量', 'Qty')];
    let cx = x; hd.forEach((h, i) => { s += Tx(i === 4 ? cx + w[i] - 1.2 : cx + 1.2, y + 3.9, h, { size: 2.3, w: 700, a: i === 4 ? 'end' : 'start' }); cx += w[i]; });
    rows.forEach((r, i) => {
      const yy = y + rh * (i + 1);
      s += Ln(x, yy, x + tw, yy, 't');
      s += R(x + 1.5, yy + 1.4, 3, 3, 'chk');
      const spec = r.spec.length > 26 && lang === 'zh' ? r.spec.slice(0, 26) : r.spec;
      s += Tx(x + w[0] + 1.2, yy + 3.9, r.id, { size: 2.3, w: 700, cls: 'acc' });
      s += Tx(x + w[0] + w[1] + 1.2, yy + 3.9, r.name, { size: 2.3 });
      s += Tx(x + w[0] + w[1] + w[2] + 1.2, yy + 3.9, spec, { size: 2.2, cls: 'mut' });
      s += Tx(x + tw - 1.2, yy + 3.9, `${r.qty} ${r.unit}`, { size: 2.3, a: 'end' });
    });
    s += R(x, y, tw, rh * (rows.length + 1), 'o');
    return s;
  };
  b += col(10, 36, T('必须', 'Required'), req);
  b += col(152, 36, T('可选（不装也能用）', 'Optional (works without)'), opt);
  b += para(152, 36 + 3 + 5.6 * (opt.length + 1) + 8, T('合页和搭扣一般自带螺丝。木螺丝是拧进木头用的金属螺丝，买「十字沉头自攻螺丝」即可，镀锌或不锈钢都行。', 'Hinges and latches usually come with screws. "Wood screws" are metal screws for wood: countersunk self-tapping wood screws, zinc-plated or stainless.'), 135, 2.4, 1.5).svg;
  return page(b);
}

function tools() {
  let b = heading(null, T('工具与准备', 'Tools and preparation'));
  const list = [
    [T('电钻 / 电动起子', 'Drill / driver'), T('钻孔、拧螺丝', 'Drilling, driving screws')],
    [T('钻头 Ø2.5、Ø3', 'Bits Ø2.5, Ø3'), T('木头引孔（合页、搭扣用 Ø2.5）', 'Pilot holes in wood (Ø2.5 for hinges and latches)')],
    [T('钻头 Ø4', 'Bit Ø4'), T('合页、搭扣在阳光板上的过孔', 'Clearance holes in the sheet for hinges and latches')],
    [T('钻头 Ø6', 'Bit Ø6'), T('阳光板螺丝孔', 'Panel screw holes')],
    [T('开孔器 Ø50', 'Hole cutter Ø50'), T('后板、顶板的过线孔', 'Cable holes in the back and top')],
    [T('十字起子头 PH2', 'Phillips bit PH2'), T('拧螺丝', 'Driving screws')],
    [T('卷尺、直角尺、铅笔', 'Tape, square, pencil'), T('划线、量方正', 'Marking out, checking square')],
    [T('F 夹 ×2', 'F-clamps ×2'), T('拼框时夹紧', 'Holding joints while screwing')],
    [T('砂纸 #120', 'Sandpaper #120'), T('磨平端面、去毛刺', 'Ends and burrs')],
    [T('纸胶带', 'Masking tape'), T('临时固定板材；钻头上做深度记号', 'Holding panels; depth mark on the bit')],
    [T('两条垫木', 'Two battens'), T('装立柱时架起底框（可借用两根木方）', 'Raise the bottom frame for the posts (two spare strips work)')],
    [T('废木板', 'Scrap board'), T('钻阳光板时垫在下面', 'Under the sheet when drilling')]
  ];
  let y = 36;
  b += Tx(12, y, T('工具', 'Tools'), { size: 3.4, w: 700 }); y += 3;
  b += R(12, y, 130, 5.4, 'thead') + Tx(13.5, y + 3.8, T('工具', 'Tool'), { size: 2.3, w: 700 }) + Tx(56, y + 3.8, T('用途', 'Use'), { size: 2.3, w: 700 });
  list.forEach(([t, u], i) => { const yy = y + 5.4 * (i + 1); b += Ln(12, yy, 142, yy, 't') + Tx(13.5, yy + 3.8, t, { size: 2.3, w: 600 }) + Tx(56, yy + 3.8, u, { size: 2.3 }); });
  b += R(12, y, 130, 5.4 * (list.length + 1), 'o');

  let x = 154; y = 36;
  b += Tx(x, y, T('开工前', 'Before you start'), { size: 3.4, w: 700 }); y += 6;
  const prep = [
    T('找一块至少 1 m × 1 m 的平整台面或地面。', 'Work on a flat area at least 1 m × 1 m.'),
    T('按编号把木料分好：A 立柱 600 ×4、B 640 ×4、C 640 ×4、D 683 ×2、E 566 ×2，用铅笔写上字母。B 和 C 一样长，随便分，但分好后别混。', 'Sort the strips and pencil the letters: A 600 ×4, B 640 ×4, C 640 ×4, D 683 ×2, E 566 ×2. B and C are the same length; split them any way but keep them apart.'),
    T('每颗木螺丝都先钻引孔，否则木方容易裂。', 'Pre-drill every wood screw or the strips may split.'),
    T('白乳胶 30 分钟初固，24 小时全干；初固后就能继续装。', 'PVA glue grabs in 30 minutes and cures in 24 hours; you can carry on after it grabs.'),
    T('阳光板的保护膜先别撕，装板时再撕朝木框那面。', 'Leave the film on the sheets; peel the side facing the frame when fitting.')
  ];
  prep.forEach(t => { const pr = para(x + 3, y, '· ' + t, 128, 2.5, 1.45); b += pr.svg; y += pr.h + 1.6; });
  y += 4;
  b += Tx(x, y, T('装配顺序', 'Order of work'), { size: 3.4, w: 700 }); y += 4;
  const flow = [T('钻板', 'Drill'), T('底框', 'Bottom'), T('立柱', 'Posts'), T('顶框+底板', 'Top+base'), T('侧板后板', 'Sides+back'), T('顶板', 'Top'), T('门', 'Door'), T('合页搭扣', 'Hinges+latches'), T('放 A1', 'Fit A1')];
  flow.forEach((t, i) => {
    const cx = x + (i % 3) * 44, cy = y + Math.floor(i / 3) * 14;
    b += RR(cx, cy, 38, 10, 1.5, 'box') + Circ(cx + 5, cy + 5, 3, 'badge') + Tx(cx + 5, cy + 6.1, String(i + 1), { size: 2.6, a: 'middle', w: 700, cls: 'inv' }) + Tx(cx + 10, cy + 6.2, t, { size: 2.5 });
  });
  return page(b);
}

function care() {
  let b = heading(null, T('使用与维护', 'Use and care'));
  let x = 12, y = 36, w = 130;
  const sec = (title, items) => {
    b += Tx(x, y, title, { size: 3.4, w: 700 }); y += 6;
    items.forEach(t => { const pr = para(x + 3, y, '· ' + t, w - 3, 2.5, 1.45); b += pr.svg; y += pr.h + 1.5; });
    y += 4;
  };
  sec(T('使用', 'Use'), [
    T('打 PLA：箱内保持 35 °C 以下；PETG 40 °C 以下。超过就开门缝或装排风扇。A1 不适合打 ABS/ASA。', 'PLA: keep it below 35 °C inside; PETG below 40 °C. Open the door a crack or add a fan if warmer. The A1 is not suited to ABS/ASA.'),
    T('拓竹官方不推荐给 A1 加封箱，长时间打印注意散热，不要在无人看管时长时间打印。', 'Bambu Lab does not recommend enclosing the A1. Watch the heat on long prints and do not leave long prints unattended.'),
    T('门往左开，左侧留约 650 mm 空间。顶板不能压重物，AMS lite 放在箱外右侧。', 'The door opens to the left; leave about 650 mm there. Do not load the top panel; keep the AMS lite outside on the right.')
  ]);
  sec(T('维护', 'Care'), [
    T('清洁阳光板：清水或中性洗洁精 + 软布。不要用丙酮、香蕉水、含氨玻璃水，也不要用干布硬擦。', 'Clean the sheets with water or mild detergent and a soft cloth. No acetone, thinners or ammonia glass cleaner, and no hard rubbing with a dry cloth.'),
    T('每 1–2 个月检查螺丝和搭扣；阳光板的螺丝只拧到垫圈贴紧。', 'Check the screws and latches every month or two; panel screws only until the washer seats.'),
    T('搬动时从底板下面抬，不要抓门或阳光板。', 'Lift it by the base, never by the door or a panel.')
  ]);
  x = 154; y = 36; w = 133;
  b += Tx(x, y, T('常见问题', 'Troubleshooting'), { size: 3.4, w: 700 }); y += 3;
  const rows = [
    [T('门关不严', 'Door does not close tight'), T('把搭扣挂钩往后挪 1–2 mm；检查合页螺丝', 'Move the latch hook back 1–2 mm; check the hinge screws')],
    [T('阳光板有压痕或起皱', 'Dents or wrinkles in a sheet'), T('那颗螺丝拧太紧，回拧 1/4 圈', 'That screw is too tight; back it off a quarter turn')],
    [T('阳光板中间鼓起', 'A sheet bulges'), T('受热膨胀，正常；顶住孔边就回拧螺丝留余量', 'Thermal expansion, normal; if it binds, back the screws off')],
    [T('箱内太热', 'Too warm inside'), T('开门缝或装排风扇（O1）', 'Open the door a crack or fit the fan (O1)')],
    [T('热床碰到框', 'Bed touches the frame'), T('A1 没居中；前脚要距前框内侧 ≥90 mm', 'A1 not centred; front feet ≥90 mm from the inside of the front frame')],
    [T('门往下垂', 'Door sags'), T('拧紧合页螺丝；门框对角线重新量方', 'Tighten the hinge screws; re-check the door diagonals')]
  ];
  const rh = 9;
  b += R(x, y, w, 5.4, 'thead') + Tx(x + 1.5, y + 3.8, T('现象', 'Problem'), { size: 2.3, w: 700 }) + Tx(x + 46, y + 3.8, T('处理', 'Fix'), { size: 2.3, w: 700 });
  rows.forEach(([p, s], i) => {
    const yy = y + 5.4 + rh * i;
    b += Ln(x, yy, x + w, yy, 't') + para(x + 1.5, yy + 3.8, p, 42, 2.3, 1.4, { w: 600 }).svg + para(x + 46, yy + 3.8, s, w - 48, 2.3, 1.4).svg;
  });
  b += R(x, y, w, 5.4 + rh * rows.length, 'o');
  return page(b);
}

function steps(P) {
  const yellow = T('黄色 = 本步要装的零件', 'Yellow = parts fitted in this step');
  return [
    stepPage({
      num: 1, title: T('阳光板钻孔', 'Drill the panels'), sub: T('商家只切板，孔自己钻。先钻好 5 块板，后面直接装。', 'The supplier only cuts the sheets; you drill them. Do all five first.'),
      art: artPanels(10, 30),
      parts: [['P1', 2], ['P2', 1], ['P3', 1], ['P4', 1], ['O8', T('可选', 'opt.'), T('铝箔胶带', 'Foil tape')]],
      ops: [
        T('确认外侧：保护膜上印字的那面通常是防紫外线面，朝外。在膜上写板号和「外」。', 'Find the outside: the printed film usually marks the UV-protected face. Write the panel number and "OUT" on that film.'),
        T('在外侧膜上划孔：孔中心距边 15 mm，每边 5 孔、四角共用，共 16 个。孔距（横 / 竖）：P1 167.5 / 162.5，P2 154 / 162.5，P3 154 / 168.25，P4 154 / 163.25。', 'Mark the holes on the film: centres 15 mm from the edge, 5 per edge with shared corners, 16 in all. Pitch (across / up): P1 167.5 / 162.5, P2 154 / 162.5, P3 154 / 168.25, P4 154 / 163.25.'),
        T('划过线孔：P2 距左 113、距下 95；P3 距右 103、距后边 113（从外侧看）。', 'Mark the cable holes: P2 113 from the left and 95 from the bottom; P3 103 from the right and 113 from the rear edge (seen from outside).'),
        T('板放在废木板上压紧，Ø6 钻头低速钻孔。过线孔先钻 Ø6 中心孔，再用 Ø50 开孔器。', 'Clamp the sheet on scrap board and drill Ø6 at low speed. For the cable holes drill a Ø6 centre first, then use the Ø50 cutter.'),
        T('可选：孔道敞开的两个边（侧板、后板、门板的上下边，顶板的前后边）贴铝箔胶带。', 'Optional: foil tape over the two open edges (top and bottom of the side, back and door panels; front and back of the top).')
      ],
      notes: [
        T('孔道方向：侧板、后板、门板竖着，顶板前后向。', 'Channels: vertical on the side, back and door panels; front to back on the top.'),
        T('孔位差 1–2 mm 没关系，装板时会透过孔给木头钻引孔对位。', 'Being 1–2 mm out is fine: you drill the wood through the holes when fitting.')
      ]
    }),
    stepPage({
      num: 2, title: T('拼底框', 'Bottom frame'), sub: T('B 通长放前后，C 夹在中间。先别装到底板上。', 'B runs front and back, C between. Do not fix it to the base yet.'),
      pic: P[2], cap: yellow + T('；底板这一步还不固定，图中只示意位置。', '; the base is not fixed yet, shown for position only.'),
      detail: detailCorner, detailTitle: T('框角怎么接', 'How the corners join'),
      parts: [['B', 2], ['C', 2], ['H5', 8], ['G1', T('适量', 'some')]],
      ops: [
        T('在平整台面上摆成矩形：两根 B 放前后，两根 C 夹在中间，都是 40 那面立着（高 40）。外形应为 640 × 700。', 'Lay out a rectangle on a flat surface: two B front and back, two C between, all standing on edge (40 high). It should measure 640 × 700.'),
        T('每个角在 B 外侧画 2 个点，对准 C 端面中线，上下各离边约 12 mm。', 'At each corner mark two points on the outside of B, on the centre line of C\'s end, about 12 mm from top and bottom.'),
        T('Ø3 钻头穿过 B，再钻进 C 约 25 mm。', 'Drill Ø3 through B and about 25 mm into C.'),
        T('接缝涂白乳胶，对齐，每角打 2 颗 4×60。', 'Glue the joint, line it up and drive two 4×60 screws per corner.'),
        T('量两条对角线，相差 ≤2 mm。等胶初固约 30 分钟。', 'Check the diagonals are within 2 mm. Let the glue grab for about 30 minutes.')
      ],
      notes: [T('底框先不要装到底板上：下一步立柱的螺丝要从底框下面往上打。', 'Do not fix the frame to the base yet: the post screws go up through it next.')]
    }),
    stepPage({
      num: 3, title: T('装立柱', 'Posts'), sub: T('4 根立柱站在底框四角，螺丝从下往上打。', 'Four posts on the corners, screwed from underneath.'),
      pic: P[3], cap: yellow,
      parts: [['A', 4], ['H5', 8], ['G1', T('适量', 'some')], ['O6', T('可选 4', 'opt. 4'), T('L 型角码', 'L brackets')]],
      ops: [
        T('把底框架在两条垫木上，让底面悬空。', 'Set the bottom frame on two battens so its underside is clear.'),
        T('立柱端面涂白乳胶，立在四角：30 那面朝前后，40 那面朝左右，外侧和底框外沿齐平。用 F 夹夹住。', 'Glue the post end and stand it on a corner: 30 mm faces front and back, 40 mm faces left and right, outer faces flush with the frame. Clamp it.'),
        T('从底框下面对着立柱钻 Ø3 引孔（穿过 40 mm 的框梁，再进立柱约 20 mm）。', 'From underneath, drill Ø3 through the 40 mm rail and about 20 mm into the post.'),
        T('每根立柱打 2 颗 4×60，两颗斜对角布置，离立柱边至少 8 mm。', 'Two 4×60 screws per post, diagonally apart and at least 8 mm from its edges.'),
        T('用直角尺检查立柱是否垂直。可选：内侧加 L 角码。', 'Check the posts are square to the frame. Optional: an L bracket on the inside.')
      ],
      notes: [T('只有下端固定时立柱会晃，装上顶框后就稳了。', 'The posts wobble until the top frame is on.')]
    }),
    stepPage({
      num: 4, title: T('顶框与底板', 'Top frame and base'), sub: T('顶框做法同底框；最后把整个框架装到底板上。', 'Build the top frame like the bottom one, then fix the whole frame to the base.'),
      pic: P[4], cap: yellow + T('；底板（木色）在本步最后固定。', '; the base (wood colour) is fixed at the end of this step.'),
      detail: detailDiag, detailTitle: T('检查方正', 'Check for square'),
      parts: [['B', 2], ['C', 2], ['H5', 16], ['F', 1], ['H6', 16], ['G1', T('适量', 'some')]],
      ops: [
        T('按第 2 步拼好顶框（同样 640 × 700，8 颗 4×60），等胶初固。', 'Build the top frame as in step 2 (640 × 700, eight 4×60), let the glue grab.'),
        T('顶框压在立柱上，外沿对齐。从上往下钻 Ø3 引孔，每根立柱打 2 颗 4×60。', 'Set it on the posts, edges flush. Drill Ø3 down into each post and drive two 4×60.'),
        T('量前面、侧面、顶面的对角线，都在 2 mm 以内。', 'Check the diagonals on the front, side and top; all within 2 mm.'),
        T('底板放平，框架放上去：前面齐平，左、右、后各留 5 mm。', 'Lay the base flat and set the frame on it: flush at the front, 5 mm in at the left, right and back.'),
        T('从底板下面钻 Ø3 引孔，用 4×40 固定，每边 3–4 颗，避开立柱下面的螺丝。', 'From underneath drill Ø3 and screw up with 4×40, 3–4 per side, clear of the post screws.')
      ],
      notes: [T('可选：底板四角装橡胶脚垫。', 'Optional: rubber feet under the base corners.')]
    }),
    stepPage({
      num: 5, title: T('侧板与后板', 'Side and back panels'), sub: T('板盖在木框外面，螺丝 + 大垫圈固定，不用胶。', 'Panels lie on the outside of the frame, screws and large washers, no glue.'),
      pic: P[5], cap: yellow,
      detail: detailFix, detailTitle: T('螺丝怎么装', 'How each screw goes in'),
      parts: [['P1', 2], ['P2', 1], ['H3', 47], ['H4', 47]],
      ops: [
        T('撕掉侧板朝内那面的保护膜。孔道竖着，前沿和立柱前面齐平，上下和框架齐平，用纸胶带临时固定。', 'Peel the inner film of a side panel. Channels vertical, front edge flush with the post fronts, top and bottom flush with the frame; tape it in place.'),
        T('透过板上每个 Ø6 孔，用 Ø3 钻头给木头钻约 18 mm 深的引孔（钻头上贴胶带做记号）。', 'Through each Ø6 hole drill a Ø3 pilot about 18 mm into the wood (tape on the bit as a depth mark).'),
        T('装 4×25 盘头自攻螺丝 + M6 加大垫圈：先四角，再每条边从中间往两端。', 'Fit 4×25 pan-head screws with M6 large washers: corners first, then each edge from the middle outward.'),
        T('另一块侧板同样装。', 'Fit the other side panel the same way.'),
        T('最后装后板：两边盖住侧板的后沿，同样钻引孔、装螺丝。', 'Fit the back panel last, covering the rear edges of the side panels.')
      ],
      notes: [
        T('左侧板前沿中间那颗孔（离底约 340 mm）先不装螺丝，第 8 步由中间的合页压住。', 'Leave the middle hole on the front edge of the left panel (about 340 mm up) empty; the middle hinge covers it in step 8.'),
        T('2 mm 板很软：拧到垫圈刚贴紧就停，再回 1/4 圈，压出白印就是太紧。', '2 mm sheet is soft: stop when the washer seats and back off a quarter turn; a white mark means too tight.')
      ]
    }),
    stepPage({
      num: 6, title: T('顶板', 'Top panel'), sub: T('同样方法固定，顶板盖住侧板和后板的上沿。', 'Same method; the top covers the top edges of the side and back panels.'),
      pic: P[6], cap: yellow,
      parts: [['P3', 1], ['H3', 16], ['H4', 16], ['O9', T('可选', 'opt.'), T('中性硅酮胶', 'Neutral silicone')]],
      ops: [
        T('撕掉顶板朝内的保护膜，孔道前后向，Ø50 过线孔在右后角。', 'Peel the inner film. Channels front to back; the Ø50 hole goes at the back right.'),
        T('前沿和框架前面齐平，盖住侧板和后板的上沿，用纸胶带临时固定。', 'Front edge flush with the frame front, covering the top edges of the side and back panels; tape it in place.'),
        T('透过孔钻 Ø3 引孔，装 4×25 螺丝 + 大垫圈。', 'Drill Ø3 pilots through the holes and fit 4×25 screws with large washers.'),
        T('可选：转角缝和板与底板之间的缝打一道中性透明硅酮胶。', 'Optional: run neutral-cure clear silicone along the corner and bottom gaps.')
      ],
      notes: [
        T('顶板不能压重物，AMS lite 放在箱外右侧桌面上。', 'Do not load the top panel; keep the AMS lite on the desk to the right.'),
        T('不要用酸性玻璃胶，会腐蚀 PC 板。', 'Do not use acid-cure silicone; it attacks PC.')
      ]
    }),
    stepPage({
      num: 7, title: T('门框与门板', 'Door'), sub: T('竖梃通长，横档夹中间；先量方正再装门板。', 'Stiles full height, rails between; square it before fitting the panel.'),
      pic: P[7], cap: yellow,
      parts: [['D', 2], ['E', 2], ['H5', 8], ['G1', T('适量', 'some')], ['P4', 1], ['H3', 16], ['H4', 16]],
      ops: [
        T('两根竖梃 D（683）放左右，两根横档 E（566）夹在上下两端之间，40 那面朝前。外形应为 646 × 683。', 'Two stiles D (683) left and right, two rails E (566) between their ends, 40 mm faces to the front. It should measure 646 × 683.'),
        T('在竖梃外侧钻 Ø3 引孔，穿过 40 mm 进横档约 20 mm。接缝涂胶，每角打 2 颗 4×60。', 'Drill Ø3 through the outside of each stile, 40 mm, and about 20 mm into the rail. Glue and drive two 4×60 per corner.'),
        T('量两条对角线，相差 ≤2 mm。', 'Check the diagonals are within 2 mm.'),
        T('门板孔道竖着，四边和门框对齐，透过孔钻引孔，装 4×25 螺丝 + 大垫圈。', 'Door panel channels vertical, edges flush with the frame; drill pilots through the holes and fit 4×25 screws with large washers.')
      ],
      notes: [T('门板装好后门框就不会变形，所以一定先量好方正再装门板。', 'Once the panel is on the door cannot rack, so square it first.')]
    }),
    stepPage({
      num: 8, title: T('合页与搭扣', 'Hinges and latches'), sub: T('左边 3 个合页，右边 2 个搭扣，都装在侧面。', 'Three hinges on the left, two latches on the right, all on the side faces.'),
      pic: P[8], cap: yellow + T('；图中门封条和拉手为可选件。', '; the door seal and handle shown are optional.'),
      detail: detailDoorPlan, detailTitle: T('装在哪里', 'Where they go'),
      parts: [['H1', 3], ['H2', 2], ['O7', T('可选', 'opt.'), T('门封泡棉条', 'Door seal foam')], ['O12', T('可选', 'opt.'), T('拉手', 'Handle')]],
      ops: [
        T('门下面垫木块，让门底和底板上表面齐平；门贴在框前面，左右和侧板外面对齐。', 'Prop the door on blocks so its bottom is level with the top of the base; hold it against the frame front, sides flush with the side panels.'),
        T('合页 3 个，中心离门底 90、341.5、593 mm。一片贴门框左侧面，一片贴左侧板外面（下面是立柱），铰轴在左前角。', 'Three hinges centred 90, 341.5 and 593 mm up. One leaf on the door\'s left edge, the other on the left side panel over the post, pin at the front-left corner.'),
        T('合页孔先在阳光板上钻 Ø4 过孔，再给木头钻 Ø2.5 引孔，用合页自带螺丝。', 'For each hinge screw drill a Ø4 clearance hole in the sheet, then a Ø2.5 pilot in the wood; use the screws supplied.'),
        T('搭扣 2 个，中心高 260、420 mm。扣体装在右侧板外靠前沿（下面是右前立柱），关上门再把挂钩装在门框右侧面。', 'Two latches centred 260 and 420 mm up. Body on the right side panel near the front (post behind); close the door and fit the hook on the door\'s right edge.'),
        T('扣上后门要贴紧框，太松就把挂钩往后挪 1–2 mm。开关几次确认不卡。', 'Latched, the door should press on the frame; if loose move the hook back 1–2 mm. Open and close a few times.')
      ],
      notes: [T('自带螺丝短于 16 mm 时，穿阳光板那一侧改用 4×25 沉头自攻螺丝。', 'If the supplied screws are shorter than 16 mm, use 4×25 countersunk wood screws on the sheet side.')]
    }),
    stepPage({
      num: 9, title: T('放入 A1 与走线', 'Fit the A1 and cables'), sub: T('最后一步：放打印机、走线、检查。', 'Last step: printer, cables, final check.'),
      pic: P[9], cap: T('AMS lite 放在箱外右侧。', 'The AMS lite stands outside on the right.'),
      parts: [['O10', T('可选 2', 'opt. 2'), T('毛刷过线孔', 'Brush grommets')]],
      ops: [
        T('可选：后板和顶板的 Ø50 孔装毛刷过线孔。', 'Optional: brush grommets in the Ø50 holes in the back and top.'),
        T('打开门，A1 放进箱内：左右居中，前脚距前框内侧 ≥90 mm，后面留插线空间。', 'Open the door and set the A1 inside: centred left to right, front feet at least 90 mm from the inside of the front frame, room behind for the cables.'),
        T('拔下 A1 端的电源插头，电源线从后板过线孔穿进来再插回。', 'Unplug the power cable at the A1, feed it through the back hole and plug it back in.'),
        T('AMS lite 放在箱子右侧，PTFE 管和线缆从顶板过线孔穿进来接到 A1。', 'Stand the AMS lite to the right and bring its PTFE tube and cable in through the top hole.'),
        T('手推热床前后走一遍，最前、最后都不能碰框（前后各约 47 mm 余量）。', 'Push the bed through its travel by hand; it must clear the frame at both ends (about 47 mm each).'),
        T('最后检查：螺丝都到位，门能扣紧，箱子不晃。', 'Final check: every screw in, the door latches tight, nothing wobbles.')
      ],
      notes: [T('门往左开，左侧要留约 650 mm 开门空间。', 'The door opens to the left; leave about 650 mm there.')]
    })
  ];
}

/* ---------- renders from the 3D model ---------- */
async function renderSteps(browser) {
  const pg = await browser.newPage({ viewport: { width: 1600, height: 1060 }, deviceScaleFactor: 1.6, colorScheme: 'light', locale: 'zh-CN' });
  await pg.goto('file://' + path.join(ROOT, 'docs', 'index.html'));
  await pg.waitForFunction(() => window.THREE !== undefined);
  await pg.waitForTimeout(1500);
  for (const id of ['#ly-dims', '#anim']) { if (await pg.isChecked(id)) await pg.click(id); }
  await pg.addStyleTag({ content: ':root{--scene:#ffffff !important;--floor:#ffffff !important}.ttl,.views,.hint,.labels,.card{display:none !important}' });
  await pg.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
  const door = async a => { await pg.evaluate(v => { const e = document.querySelector('#door'); e.value = v; e.dispatchEvent(new Event('input')); }, a); };
  const shot = async () => { await pg.waitForTimeout(1800); return crop(browser, await pg.locator('#gl').screenshot()); };
  const out = {};
  await pg.click('.tabs [data-tab="asm"]');
  for (const k of [2, 3, 4, 5, 6, 7, 8, 9]) {
    await pg.evaluate(v => { const e = document.querySelector('#stRange'); e.value = v; e.dispatchEvent(new Event('input')); }, k);
    await door(k === 8 ? 100 : k === 9 ? 70 : 0);
    out[k] = await shot();
  }
  await pg.click('#stAll');
  await door(60);
  out.cover = await shot();
  await pg.close();
  return out;
}
// trim the white border and return a JPEG data URL
async function crop(browser, buf) {
  const pg = await browser.newPage();
  const res = await pg.evaluate(async url => {
    const im = new Image(); im.src = url; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y += 2) for (let xx = 0; xx < c.width; xx += 2) {
      const i = (y * c.width + xx) * 4;
      if (d[i] < 244 || d[i + 1] < 244 || d[i + 2] < 244) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const m = 30; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(c.width, x1 + m); y1 = Math.min(c.height, y1 + m);
    const o = document.createElement('canvas'); o.width = x1 - x0; o.height = y1 - y0;
    const ox = o.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height);
    ox.drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return o.toDataURL('image/jpeg', 0.86);
  }, 'data:image/png;base64,' + buf.toString('base64'));
  await pg.close();
  return res;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const P = await renderSteps(browser);
  for (const l of ['zh', 'en']) {
    lang = l;
    BOM = loadBOM(l === 'zh' ? 'bom.csv' : 'bom.en.csv');
    pageNo = 0; total = 13;
    const pages = cover(P.cover) + inventory() + tools() + steps(P).join('') + care();
    const html = `<!doctype html><html lang="${l === 'zh' ? 'zh-CN' : 'en'}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;700&display=swap">
<style>${CSS}</style></head><body>${pages}</body></html>`;
    if (process.env.KEEP_HTML) fs.writeFileSync(path.join(OUT, `manual-${l}.html`), html);
    const pg = await browser.newPage();
    await pg.setContent(html, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, `A1-enclosure-manual-${l}.pdf`);
    await pg.pdf({ path: file, width: '297mm', height: '210mm', printBackground: true });
    await pg.close();
    console.log('wrote', path.relative(ROOT, file), `(${pageNo} pages)`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
