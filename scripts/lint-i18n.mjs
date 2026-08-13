#!/usr/bin/env node
// Linter cho cay dich i18n/en — bu cho lint-docs.mjs, vi no chi walk docs/.
//
// Bay ma script nay ton tai de chan:
//   1. Ban en lech noi dung ma khong co gi bao (drift) — I2
//   2. Ban dich "giup" viet lai output that / ten catalog / so do — I5, luat cung #2
//   3. sidebar_position lech giua hai locale, sidebar en sap khac vi — I4
//   4. verified_at tu moc len o ban en — I6, luat cung #1
//
// Chay: npm run lint:i18n
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DOCS = 'docs';
const EN = 'i18n/en/docusaurus-plugin-content-docs/current';

// catalog.md do scripts/gen-catalog.mjs sinh ra — dich tay se bi ghi de moi lan
// `npm run catalog`. Van PHAI ton tai trong cay en (docs/index.md tro toi no, thieu
// la build chet), nhung duoc mien cac rule noi dung.
const MIEN_NOI_DUNG = new Set(['catalog.md']);

const problems = [];
const add = (file, rule, msg, sev = 'ERR') => problems.push({ file, rule, msg, sev });

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    // [a-z0-9_] chu khong phai [a-z_]: `i18n_status` co chu so trong ten field
    const kv = line.match(/^([a-z0-9_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/(^|\s+)#.*$/, '').trim();
  }
  return fm;
}

// Cac khoi ```...``` — thu can copy nguyen byte, khong duoc di qua tay dich.
function codeBlocks(src) {
  const out = [];
  const re = /^([ \t]*)(```+|~~~+)([^\n]*)\n([\s\S]*?)^[ \t]*\2[ \t]*$/gm;
  let m;
  while ((m = re.exec(src)) !== null) out.push({ lang: m[3].trim(), body: m[4] });
  return out;
}

// Comment duoc dich; lenh va output thi khong.
// Bo comment (ca dong VA cuoi dong) + dong trong, roi so phan con lai.
//
// Dau comment phu thuoc ngon ngu, va phai the: neu bo bua ` --` thi
// `npm run lint -- --locale en` trong khoi bash bi cat mat mot nua.
const DAU_COMMENT = {
  bash: '#', sh: '#', shell: '#', zsh: '#', console: '#',
  python: '#', py: '#', yaml: '#', yml: '#', toml: '#', ini: '#', dockerfile: '#',
  sql: '--',
  js: '//', ts: '//', jsx: '//', tsx: '//', csharp: '//', cs: '//', java: '//', go: '//',
};

const xuong = (body, lang) => {
  // Khoi khong khai lang, hoac `text`/`output`: day la OUTPUT THAT, khong co comment.
  // Khong bo gi ca — so nguyen van, dung nhat.
  const dau = DAU_COMMENT[(lang || '').split(/\s+/)[0].toLowerCase()];
  // Comment khoi `/* ... */` (co the nhieu dong) cung duoc dich — chi ap cho ngon ngu
  // ho C/SQL. Bo TRUOC khi tach dong, vi no khong theo ranh gioi dong.
  if (dau === '//' || dau === '--') body = body.replace(/\/\*[\s\S]*?\*\//g, '');
  return body
    .split(/\r?\n/)
    .map((l) => {
      if (!dau) return l.trim();
      // cuoi dong: phai co khoang trang truoc dau comment. `#!/usr/bin/env bash`
      // va `${var#prefix}` khong bi cat vi khong co khoang trang truoc `#`.
      const re = dau === '#' ? /\s+#.*$/ : dau === '--' ? /\s+--\s.*$/ : /\s+\/\/.*$/;
      return l.replace(re, '').trim();
    })
    .filter((l) => l && (!dau || !l.startsWith(dau)))
    .join('\n');
};

const viFiles = walk(DOCS).sort();
const enFiles = walk(EN).sort();
let daDich = 0;
let conStub = 0;

for (const vf of viFiles) {
  const rel = relative(DOCS, vf).replace(/\\/g, '/');
  const ef = join(EN, rel);

  // I1 — THIEU FILE trong cay en. Khong phai chuyen tien do: link markdown tuong doi
  // chi resolve trong cay da dich, nen mot file en tro toi day se lam build chet.
  // Sinh lai bang `npm run i18n:stub`.
  if (!existsSync(ef)) {
    add(rel, 'I1', 'thieu file trong cay en — link tro toi day se lam build chet, chay `npm run i18n:stub`');
    continue;
  }

  const vs = readFileSync(vf, 'utf8');
  const es = readFileSync(ef, 'utf8');
  const vfm = frontmatter(vs);
  const efm = frontmatter(es);

  if (!efm) { add(rel, 'I0', 'ban en khong co frontmatter'); continue; }

  // catalog.md do generator sinh — khong bao gio dich tay, nen bo han khoi thuoc do
  // tien do. Neu khong thi tien do vinh vien dung o 234/235.
  if (MIEN_NOI_DUNG.has(rel)) continue;

  // I8 — stub chua dich. Day moi la thuoc do tien do.
  const stub = efm.i18n_status === 'untranslated';
  if (stub) {
    conStub++;
    add(rel, 'I8', 'con la stub tieng Viet — chua dich', 'WARN');
    continue;   // stub la ban copy nguyen van, moi rule con lai se pass rong
  }
  daDich++;

  // I2 — drift: sua ban vi ma khong sua ban en.
  if (vfm?.updated && efm.updated !== vfm.updated)
    add(rel, 'I2', `updated en="${efm.updated || '(trong)'}" != vi="${vfm.updated}" — ban vi da doi, ban en chua theo`);

  // I3 — title/description phai duoc dich, khong phai copy nguyen van tieng Viet.
  if (vfm?.description && efm.description === vfm.description)
    add(rel, 'I3', 'description con nguyen tieng Viet — chua dich', 'WARN');

  // I4 — sidebar_position lech thi sidebar en sap khac vi, im lang khong loi nao bao.
  if ((vfm?.sidebar_position ?? '') !== (efm.sidebar_position ?? ''))
    add(rel, 'I4', `sidebar_position en="${efm.sidebar_position ?? '(trong)'}" != vi="${vfm?.sidebar_position ?? '(trong)'}"`);

  // I5 — LUAT CUNG #2. Khoi code la output that / ten catalog / so do: copy nguyen byte.
  // Chi comment trong khoi duoc dich.
  const vb = codeBlocks(vs);
  const eb = codeBlocks(es);
  if (vb.length !== eb.length) {
    add(rel, 'I5', `so khoi code lech: vi=${vb.length}, en=${eb.length} — khong duoc them/bo khoi khi dich`);
  } else {
    for (let i = 0; i < vb.length; i++) {
      if (vb[i].lang !== eb[i].lang)
        add(rel, 'I5', `khoi code #${i + 1}: lang "${eb[i].lang}" != "${vb[i].lang}"`);
      // Hai loai khoi duoc mien so sanh noi dung, vi chung la VAN XUOI nam trong fence
      // chu khong phai bang chung:
      //   - `mermaid`: nhan node phai duoc dich
      //   - `<lang> i18n-prose`: so do ASCII, learning path… tac gia khai bao ro y dinh
      //     ngay trong file nguon. MAC DINH la khong duoc mien — phai go nhan vao ca hai ban.
      // Van bat lech so luong va thu tu khoi o tren.
      else if (!/(^|\s)(mermaid|i18n-prose)(\s|$)/.test(vb[i].lang) &&
               xuong(vb[i].body, vb[i].lang) !== xuong(eb[i].body, eb[i].lang))
        add(rel, 'I5', `khoi code #${i + 1} (${vb[i].lang || 'khong lang'}) bi sua khi dich — lenh/output phai copy nguyen byte, chi comment moi duoc dich`);
    }
  }

  // I9 — <details> lech so voi </details> lam MDX chet, va build mat 30 giay moi bao.
  // Bat o day cho re. So sanh ca voi ban vi de khong am tham bo mat mot muc FAQ.
  // Phai bo khoi code va inline code truoc khi dem: `<details>` nhac trong backtick
  // la van ban, khong phai the — MDX khong chet vi no.
  const boCode = (s) => s.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');
  const dem = (s, re) => (boCode(s).match(re) || []).length;
  const vOpen = dem(vs, /<details>/g), vClose = dem(vs, /<\/details>/g);
  const eOpen = dem(es, /<details>/g), eClose = dem(es, /<\/details>/g);
  if (eOpen !== eClose)
    add(rel, 'I9', `<details>=${eOpen} nhung </details>=${eClose} — MDX se chet`);
  else if (eOpen !== vOpen)
    add(rel, 'I9', `so khoi <details> lech: vi=${vOpen}, en=${eOpen} — thieu/thua mot muc FAQ`);

  // I6 — LUAT CUNG #1. verified_at nghia la chu repo da chay tay; ban dich khong
  // tao ra bang chung moi, nen phai bang y ban vi.
  if ((vfm?.verified_at ?? '') !== (efm.verified_at ?? ''))
    add(rel, 'I6', `verified_at en="${efm.verified_at || '(trong)'}" != vi="${vfm?.verified_at || '(trong)'}" — ban dich khong duoc tu dien`);
}

// I7 — file en mo coi: khong con cap vi (vi da doi ten hoac bi xoa).
for (const ef of enFiles) {
  const rel = relative(EN, ef).replace(/\\/g, '/');
  if (!existsSync(join(DOCS, rel))) add(rel, 'I7', 'chi co ban en, khong co ban vi — vi da doi ten hay bi xoa?');
}

const RULES = {
  I0: 'ban en thieu frontmatter',
  I1: 'thieu file trong cay en — build se chet',
  I2: 'drift — ban vi da doi',
  I3: 'description chua dich',
  I4: 'sidebar_position lech',
  I5: 'khoi code bi sua khi dich (luat cung #2)',
  I6: 'verified_at lech (luat cung #1)',
  I7: 'ban en mo coi',
  I8: 'con la stub, chua dich',
  I9: '<details> khong can — MDX se chet',
};

const errs = problems.filter((p) => p.sev === 'ERR');
const warns = problems.filter((p) => p.sev === 'WARN');

for (const sev of ['ERR', 'WARN']) {
  const nhom = problems.filter((p) => p.sev === sev);
  if (!nhom.length) continue;
  for (const rule of Object.keys(RULES)) {
    const cua = nhom.filter((p) => p.rule === rule);
    if (!cua.length) continue;
    console.log(`\n${sev} ${rule} — ${RULES[rule]} (${cua.length})`);
    for (const p of cua.slice(0, 15)) console.log(`   ${p.file}: ${p.msg}`);
    if (cua.length > 15) console.log(`   … con ${cua.length - 15} file nua`);
  }
}

const tong = viFiles.length;
const pct = tong ? Math.round((daDich / tong) * 1000) / 10 : 0;
console.log(`\nTien do dich: ${daDich}/${tong} file (${pct}%) — con ${conStub} stub`);
console.log(`${errs.length} error, ${warns.length} warning`);
process.exit(errs.length ? 1 : 0);
