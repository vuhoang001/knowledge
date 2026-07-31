#!/usr/bin/env node
// Cuong che bo rule dinh tuyen cua kho. `npm run build` chi bat link gay va YAML hong;
// script nay bat cai build khong thay: file mo coi, dat sai tang, frontmatter thieu.
// Chay: npm run lint
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { generate as generateCatalog } from './gen-catalog.mjs';

const DOCS = 'docs';
// Truc TRI THUC — no la KIEU hieu biet nao. Dung de loc.
// 'index'/'placeholder' la nhan cau truc: file dieu huong, khong mang tri thuc.
const KIND = ['concept', 'technology', 'pattern', 'tool', 'index', 'placeholder'];
// Truc TAI LIEU — no la DANG gi. Quyet dinh file nam thu muc nao.
const DOCTYPE = ['reference', 'skill', 'tutorial', 'case-study', 'cheatsheet', 'faq', 'glossary', 'example', 'index'];
// doc_type <-> ten thu muc. Thu muc nay nam TRONG tung chu de
// (docs/etl/dbt/case-studies/), tru faqs/ va glossary/ von cat ngang moi chu de.
// Nam nhom chuan cho MOI chu de: reference/ skills/ tutorials/ cheatsheets/ case-studies/
// faqs/ va glossary/ toan cuc — chung cat ngang nhieu chu de theo dinh nghia.
const DOCTYPE_DIR = {
  reference: 'reference', skill: 'skills', tutorial: 'tutorials',
  'case-study': 'case-studies', cheatsheet: 'cheatsheets',
  faq: 'faqs', glossary: 'glossary', example: 'examples',
};
const DIR_DOCTYPE = Object.fromEntries(Object.entries(DOCTYPE_DIR).map(([k, v]) => [v, k]));
// doc_type dung ra phai la gi, suy tu duong dan
function expectedDocType(rel) {
  if (basename(rel) === 'index.md') return 'index';
  for (const seg of rel.split('/').slice(0, -1)) if (DIR_DOCTYPE[seg]) return DIR_DOCTYPE[seg];
  return 'reference';
}
const ENUMS = {
  status: ['draft', 'review', 'stable'],
  difficulty: ['beginner', 'intermediate', 'advanced'],
};
const REQUIRED = ['title', 'description', 'tags', 'domain', 'category', 'status', 'difficulty', 'updated'];

// ERR = he thong hong (sidebar sai, file mo coi, build se chet). CI chan.
// WARN = no noi dung, khong chan CI.
const problems = [];
const add = (file, rule, msg, sev = 'ERR') => problems.push({ file, rule, msg, sev });

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

// Parse frontmatter don gian — du cho tap truong phang cua kho nay.
function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    // bo comment YAML: `verified_at: 2026-07-30  # da chay tay`
    if (kv) fm[kv[1]] = kv[2].replace(/(^|\s+)#.*$/, '').trim();
  }
  return fm;
}

const files = walk(DOCS).sort();
const manifest = readFileSync(join(DOCS, 'index.md'), 'utf8');

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const fm = frontmatter(src);
  const rel = relative(DOCS, file);
  const isIndex = basename(file) === 'index.md';
  const isRoot = rel === 'index.md';

  // R1 — frontmatter ton tai va du truong
  if (!fm) { add(file, 'R1', 'khong co frontmatter'); continue; }
  const placeholder = fm.category === 'placeholder';
  // File giu cho va trang muc luc khong phai khai domain/difficulty/tags — chung khong
  // mang tri thuc, chi ton tai de category khong rong va de dieu huong.
  // Mien theo doc_type, khong theo ten file: catalog.md cung la trang dieu huong.
  const light = placeholder || isRoot || isIndex || fm.doc_type === 'index';
  for (const k of REQUIRED) {
    if (light && ['tags', 'domain', 'difficulty', 'status'].includes(k)) continue;
    if (!(k in fm) || fm[k] === '') add(file, 'R1', `thieu truong bat buoc: ${k}`);
  }

  // R2 — gia tri enum hop le
  for (const [k, allowed] of Object.entries(ENUMS)) {
    if (fm[k] && !allowed.includes(fm[k])) add(file, 'R2', `${k}="${fm[k]}" khong thuoc [${allowed.join('|')}]`);
  }
  if (fm.category && !KIND.includes(fm.category))
    add(file, 'R2', `category="${fm.category}" khong thuoc truc tri thuc [${KIND.join('|')}]`);

  // R12 — doc_type bat buoc, hop le, va PHAI KHOP thu muc goc
  if (!fm.doc_type) {
    add(file, 'R12', 'thieu doc_type — khong phan loai duoc theo dang tai lieu');
  } else if (!DOCTYPE.includes(fm.doc_type)) {
    add(file, 'R12', `doc_type="${fm.doc_type}" khong hop le [${DOCTYPE.join('|')}]`);
  } else if (fm.doc_type !== 'index') {
    // trang dieu huong nam dau cung duoc; cac loai con lai phai khop duong dan
    const want = expectedDocType(rel);
    if (fm.doc_type !== want)
      add(file, 'R12', `doc_type="${fm.doc_type}" nhung duong dan noi day la "${want}" — sua mot trong hai`);
  }

  // R3 — description chua ':' ma khong quote se lam build chet
  if (fm.description && /:/.test(fm.description) && !/^["']/.test(fm.description))
    add(file, 'R3', 'description chua ":" nhung khong quote — build se chet');

  // R4 — verified_at phai trong hoac la ngay YYYY-MM-DD
  if (fm.verified_at && !/^\d{4}-\d{2}-\d{2}$/.test(fm.verified_at))
    add(file, 'R4', `verified_at="${fm.verified_at}" khong phai dang YYYY-MM-DD`);

  if (placeholder || isRoot) continue;

  // R5 — file noi dung phai co sidebar_position
  if (!isIndex && !('sidebar_position' in fm))
    add(file, 'R5', 'thieu sidebar_position — sidebar se sap theo alphabet, khong theo thu tu hoc');

  // R6 — chong mo coi: index.md cung thu muc phai tro toi
  if (!isIndex) {
    const idx = join(dirname(file), 'index.md');
    if (!existsSync(idx)) add(file, 'R6', 'thu muc khong co index.md');
    else if (!readFileSync(idx, 'utf8').includes(basename(file)))
      add(file, 'R6', `index.md cung thu muc khong tro toi ${basename(file)}`);
  }

  // R7 — phai co trong manifest docs/index.md
  if (!isIndex && !manifest.includes(rel.replace(/\\/g, '/')))
    add(file, 'R7', 'khong co trong manifest docs/index.md', 'WARN');

  // R8 — moi file ly thuyet phai co Related Topics
  if (!/^##\s+Related Topics/m.test(src))
    add(file, 'R8', 'thieu muc "## Related Topics"', 'WARN');

  // R9 — toi da 3 thu muc duoi docs/:
  //   docs/<linh vuc>/<cong nghe>/<nhom>/<file>.md
  // Tang thu 3 CHI danh cho nhom doc_type (case-studies/, cheatsheets/, tutorials/)
  // hoac tang hoc. Component ky thuat can them tang = nen tach thanh cong nghe rieng.
  if (rel.split('/').length > 4)
    add(file, 'R9', `${rel.split('/').length - 1} thu muc duoi docs/ — toi da 3`);
}

// R13 — chu de phai DAN toi tai lieu cua no nam o thu muc khac.
// File khong di chuyen; cai phai co la duong dan toi no tu index chu de.
// Khoa noi = ten thu muc chu de, doi chieu voi `tags` cua tai lieu.
const CROSS = ['faq', 'glossary'];   // chi con hai loai cat ngang nam ngoai chu de
const DIRS_OF_DOCTYPE = new Set(Object.values(DOCTYPE_DIR));
const parseTags = (v) => (v || '').replace(/^\[|\]$/g, '').split(',').map((x) => x.trim()).filter(Boolean);

const allFm = files.map((f) => ({ f, fm: frontmatter(readFileSync(f, 'utf8')) || {} }));
const crossDocs = allFm.filter((r) => CROSS.includes(r.fm.doc_type));

for (const { f, fm } of allFm) {
  if (basename(f) !== 'index.md') continue;
  const rel = relative(DOCS, f);
  const parts = rel.split('/');
  if (parts.length < 2) continue;                       // docs/index.md
  if (DIRS_OF_DOCTYPE.has(parts[0])) continue;          // chinh cac thu muc doc_type
  if (fm.category === 'placeholder') continue;

  const key = parts[parts.length - 2];                  // ten thu muc chu de
  const matches = crossDocs.filter((d) => parseTags(d.fm.tags).includes(key));
  if (!matches.length) continue;

  const src = readFileSync(f, 'utf8');
  if (!/^##\s+Liên quan trong kho/m.test(src))
    add(f, 'R13', `co ${matches.length} tai lieu mang tag "${key}" o thu muc khac — thieu muc "## Liên quan trong kho"`);
  for (const m of matches)
    if (!src.includes(basename(m.f)))
      add(f, 'R13', `khong dan toi ${m.f} (doc_type=${m.fm.doc_type}, tag "${key}")`);
}

// R10 — sidebar_position trung trong cung thu muc
const byDir = {};
for (const file of files) {
  const fm = frontmatter(readFileSync(file, 'utf8'));
  if (!fm || !('sidebar_position' in fm)) continue;
  (byDir[dirname(file)] ??= []).push([basename(file), fm.sidebar_position]);
}
for (const [dir, list] of Object.entries(byDir)) {
  const seen = {};
  for (const [f, p] of list) {
    if (seen[p]) add(join(dir, f), 'R10', `sidebar_position=${p} trung voi ${seen[p]}`);
    else seen[p] = f;
  }
}

// R11 — thu muc co _category_.json phai co it nhat mot .md (category rong = build chet)
function dirs(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { out.push(p); dirs(p, out); }
  }
  return out;
}
for (const d of dirs(DOCS)) {
  if (!existsSync(join(d, '_category_.json'))) { add(d, 'R11', 'thu muc thieu _category_.json', 'WARN'); continue; }
  if (!readdirSync(d).some((f) => f.endsWith('.md'))) add(d, 'R11', 'co _category_.json nhung khong co .md — build se chet');
}

// R14 — docs/catalog.md phai khop ket qua sinh. Trang gom ma cu thi te hon khong co.
{
  const out = join(DOCS, 'catalog.md');
  if (!existsSync(out)) add(out, 'R14', 'chua sinh — chay `npm run catalog`');
  else if (readFileSync(out, 'utf8') !== generateCatalog())
    add(out, 'R14', 'da cu so voi frontmatter thuc te — chay `npm run catalog`');
}

const RULES = {
  R1: 'frontmatter du truong', R2: 'category thuoc truc tri thuc', R3: 'description quote dung',
  R4: 'verified_at dung dang', R5: 'co sidebar_position', R6: 'khong mo coi trong thu muc',
  R7: 'co trong manifest', R8: 'co Related Topics', R9: 'do sau toi da 3 tang',
  R10: 'sidebar_position khong trung', R11: '_category_.json hop le',
  R12: 'doc_type khop thu muc', R13: 'chu de dan toi tai lieu cua no',
  R14: 'catalog.md con moi',
};

// --inventory: kiem ke kho theo hai truc, de tra loi "cho toi moi case study"
if (process.argv.includes('--inventory')) {
  const rows = files.map((f) => ({ f, fm: frontmatter(readFileSync(f, 'utf8')) || {} }));
  const pivot = {};
  for (const { fm } of rows) {
    const dt = fm.doc_type || '?', d = fm.domain || '—';
    ((pivot[dt] ??= {})[d] ??= 0), pivot[dt][d]++;
  }
  console.log('KIEM KE — doc_type x domain\n');
  for (const [dt, byDom] of Object.entries(pivot).sort()) {
    const tot = Object.values(byDom).reduce((a, b) => a + b, 0);
    console.log(`${dt.padEnd(12)} ${String(tot).padStart(3)}   ${Object.entries(byDom).map(([d, n]) => `${d}:${n}`).join('  ')}`);
  }
  const kb = rows.filter((r) => !['index'].includes(r.fm.doc_type) && r.fm.category !== 'placeholder');
  console.log(`\nFile mang tri thuc: ${kb.length}/${files.length}`);
  console.log(`Da kiem chung tay (verified_at co ngay): ${kb.filter((r) => /^\d{4}/.test(r.fm.verified_at || '')).length}`);
  process.exit(0);
}

const errs = problems.filter((p) => p.sev === 'ERR');
const warns = problems.filter((p) => p.sev === 'WARN');
const show = (list, title) => {
  if (!list.length) return;
  console.log(`\n=== ${title} (${list.length}) ===`);
  const byRule = {};
  for (const p of list) (byRule[p.rule] ??= []).push(p);
  for (const r of Object.keys(RULES)) {
    if (!byRule[r]) continue;
    console.log(`\n${r} — ${RULES[r]}  (${byRule[r].length})`);
    for (const p of byRule[r]) console.log(`   ${p.file}: ${p.msg}`);
  }
};
show(errs, 'ERROR — he thong hong, CI chan');
show(warns, 'WARN — no noi dung, khong chan CI');
console.log(`\n${files.length} file — ${errs.length} error, ${warns.length} warning`);
process.exit(errs.length ? 1 : 0);
