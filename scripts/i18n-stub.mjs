#!/usr/bin/env node
// Sinh stub cho moi file docs/ chua co ban dich en.
//
// Vi sao phai co stub thay vi de Docusaurus fallback:
//   Noi dung thi fallback that — file en thieu thi trang hien ban vi.
//   Nhung LINK markdown tuong doi (`../x/y.md`) chi resolve TRONG cay da dich.
//   Mot file en da dich tro toi file chua dich => onBrokenLinks:'throw' lam build chet.
// Nen cay en phai day du 235 file tu dau. File chua dich la ban copy tieng Viet,
// mang nhan `i18n_status: untranslated` de lint-i18n dem tien do va de nguoi doc biet.
//
// Chay lai bao nhieu lan cung duoc — file da co thi bo qua, khong ghi de ban dich.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const DOCS = 'docs';
const EN = 'i18n/en/docusaurus-plugin-content-docs/current';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

let them = 0, bo = 0;
for (const vf of walk(DOCS).sort()) {
  const rel = relative(DOCS, vf).replace(/\\/g, '/');
  const ef = join(EN, rel);
  if (existsSync(ef)) { bo++; continue; }

  const src = readFileSync(vf, 'utf8');
  // Chen nhan ngay sau dong `title:` — cho de thay khi mo file.
  const out = /^title:/m.test(src)
    ? src.replace(/^(title:.*\n)/m, '$1i18n_status: untranslated\n')
    : src;
  if (out === src) console.log(`CANH BAO: khong chen duoc nhan (khong co title:): ${rel}`);
  mkdirSync(dirname(ef), { recursive: true });
  writeFileSync(ef, out);
  them++;
}
console.log(`stub moi: ${them} · da co san: ${bo}`);
