#!/usr/bin/env node
// Sinh docs/catalog.md — mot cho gom moi file, chia theo doc_type.
// Chay: npm run catalog
// Linter R14 kiem file tren dia co khop voi ket qua sinh khong, nen no khong the cu.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const DOCS = 'docs';
const OUT = join(DOCS, 'catalog.md');

// Thu tu hien thi + nhan. Bo 'index' va placeholder: chung dieu huong, khong mang tri thuc.
const SECTIONS = [
  ['reference', 'Tài liệu tham chiếu', 'Giải thích *nó là gì, vì sao, đánh đổi ra sao*.'],
  ['tutorial', 'Bài tập', 'Chạy thật, có ô dán output. Chưa chạy thì chưa gọi là học.'],
  ['case-study', 'Case study', 'Sự cố thật đã debug xong, kèm giả thuyết sai lúc đầu.'],
  ['cheatsheet', 'Cheatsheet', 'Tra nhanh khi **đang làm** — không dùng để học lần đầu.'],
  ['faq', 'FAQ', 'Câu hỏi cắt ngang nhiều chủ đề.'],
  ['example', 'Ví dụ code', 'Đoạn chạy được nguyên trạng, để copy.'],
  ['glossary', 'Thuật ngữ', 'Định nghĩa một câu.'],
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/(^|\s+)#.*$/, '').trim();
  }
  return fm;
}

// Chu de = thu muc chua file, doc duoc hon la duong dan day du
const subjectOf = (rel) => {
  const d = dirname(rel);
  return d === '.' ? '—' : d;
};

const statusIcon = (fm) => {
  if (/^\d{4}/.test(fm.verified_at || '')) return '✅ đã chạy tay';
  if (fm.status === 'stable') return '📘 ổn định, chưa chạy tay';
  if (fm.status === 'review') return '📝 lý thuyết';
  return '🟡 draft';
};

export function generate() {
  const rows = walk(DOCS)
    .filter((f) => f !== OUT)
    .map((f) => ({ rel: relative(DOCS, f).replace(/\\/g, '/'), fm: frontmatter(readFileSync(f, 'utf8')) }))
    .filter((r) => r.fm.doc_type && r.fm.doc_type !== 'index' && r.fm.category !== 'placeholder')
    .sort((a, b) => a.rel.localeCompare(b.rel));

  const L = [];
  L.push('---');
  L.push('title: Thư viện — gom theo loại tài liệu');
  L.push('sidebar_position: 1');
  L.push('description: "Mọi file trong kho gom về một chỗ, chia theo loại: tài liệu, bài tập, case study, cheatsheet."');
  L.push('tags: [catalog, index]');
  L.push('category: index');
  L.push('doc_type: index');
  L.push('updated: 2026-07-31');
  L.push('---');
  L.push('');
  L.push('# Thư viện — gom theo loại tài liệu');
  L.push('');
  L.push('> **File này sinh tự động** bằng `npm run catalog`. Đừng sửa tay — linter R14 so');
  L.push('> lại với frontmatter thật và chặn CI nếu lệch.');
  L.push('');
  L.push('[`docs/index.md`](index.md) gom theo **chủ đề**. Trang này gom theo **dạng tài liệu**.');
  L.push('Cùng một tập file, hai đường vào. Cần cắt theo chủ đề *và* dạng cùng lúc thì dùng');
  L.push('trang tag, ví dụ [`/tags/data-modeling`](/tags/data-modeling).');
  L.push('');

  const total = rows.length;
  const verified = rows.filter((r) => /^\d{4}/.test(r.fm.verified_at || '')).length;
  L.push(`**${total} file mang tri thức · ${verified} đã kiểm chứng bằng tay.**`);
  L.push('');

  for (const [dt, label, blurb] of SECTIONS) {
    const list = rows.filter((r) => r.fm.doc_type === dt);
    L.push(`## ${label} (${list.length})`);
    L.push('');
    L.push(blurb);
    L.push('');
    if (!list.length) {
      L.push('*Chưa có file nào.*');
      L.push('');
      continue;
    }
    L.push('| Tài liệu | Chủ đề | Lĩnh vực | Trạng thái |');
    L.push('|---|---|---|---|');
    for (const r of list) {
      const title = (r.fm.title || r.rel).replace(/\|/g, '\\|');
      L.push(`| [${title}](${r.rel}) | \`${subjectOf(r.rel)}\` | ${r.fm.domain || '—'} | ${statusIcon(r.fm)} |`);
    }
    L.push('');
  }

  L.push('## Related Topics');
  L.push('');
  L.push('- [Mục lục theo chủ đề](index.md) — cùng tập file, gom theo lĩnh vực');
  L.push('- [`ROUTING.md`](https://github.com/vuhoang001/knowledge/blob/main/ROUTING.md) — rule quyết định `doc_type`');
  L.push('');
  return L.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('gen-catalog.mjs')) {
  writeFileSync(OUT, generate(), 'utf8');
  console.log(`da sinh ${OUT}`);
}
