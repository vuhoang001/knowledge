#!/usr/bin/env node
// Cuong che bo rule dinh tuyen cua kho. `npm run build` chi bat link gay va YAML hong;
// script nay bat cai build khong thay: file mo coi, dat sai tang, frontmatter thieu.
// Chay: npm run lint
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';

const DOCS = 'docs';
// Truc 1 — loai TRI THUC. Dung de loc va tim.
const KIND = ['concept', 'technology', 'pattern', 'tool'];
// Truc 2 — loai TAI LIEU. Quyet dinh file nam thu muc nao.
const DOCTYPE = ['reference', 'tutorial', 'case-study', 'cheatsheet', 'faq', 'index', 'example', 'placeholder'];
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
  const light = placeholder || isRoot || isIndex;
  for (const k of REQUIRED) {
    if (light && ['tags', 'domain', 'difficulty', 'status'].includes(k)) continue;
    if (!(k in fm) || fm[k] === '') add(file, 'R1', `thieu truong bat buoc: ${k}`);
  }

  // R2 — gia tri enum hop le
  for (const [k, allowed] of Object.entries(ENUMS)) {
    if (fm[k] && !allowed.includes(fm[k])) add(file, 'R2', `${k}="${fm[k]}" khong thuoc [${allowed.join('|')}]`);
  }
  if (fm.category && ![...KIND, ...DOCTYPE].includes(fm.category))
    add(file, 'R2', `category="${fm.category}" khong thuoc truc nao`);
  // R2b — category dang gong hai truc: gia tri doc-type nam o cho danh cho loai tri thuc
  if (fm.category && DOCTYPE.includes(fm.category) && fm.category !== 'placeholder' && fm.category !== 'index')
    add(file, 'R2b', `category="${fm.category}" la loai TAI LIEU, khong phai loai TRI THUC — nen tach sang truong doc_type`, 'WARN');

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

  // R9 — do sau toi da 3 tang duoi docs/
  if (rel.split('/').length > 4)
    add(file, 'R9', `sau ${rel.split('/').length - 1} tang — toi da 3`);
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

const RULES = {
  R1: 'frontmatter du truong', R2: 'gia tri enum hop le', R2b: 'category gong hai truc', R3: 'description quote dung',
  R4: 'verified_at dung dang', R5: 'co sidebar_position', R6: 'khong mo coi trong thu muc',
  R7: 'co trong manifest', R8: 'co Related Topics', R9: 'do sau toi da 3 tang',
  R10: 'sidebar_position khong trung', R11: '_category_.json hop le',
};

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
