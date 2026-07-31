#!/usr/bin/env node
/**
 * Kiem tra bo the Anki:
 *   1. Do phu  — file docs nao chua co the nao tro toi, file nao sua sau lan sinh the
 *   2. Chat luong — 4 luat trong anki/README.md
 *   3. Ky thuat — so cot, cu phap cloze, ky tu chua escape
 *
 * Chay: npm run anki:check
 * Thoat khac 0 khi co loi ky thuat hoac vi pham chat luong.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = new URL('..', import.meta.url).pathname
const ANKI = join(ROOT, 'anki')
const DOCS = join(ROOT, 'docs')

const TAG_HTML = /<\/?(b|i|br|small|code|u|em)\s*\/?>/g
const NGUON = /<small>([^<]+)<\/small>/g

let loi = 0
let canh = 0

// ---------- doc file the ----------

function docTheTsv(ten) {
  const noiDung = readFileSync(join(ANKI, ten), 'utf8')
  const dong = noiDung.split('\n')
  const meta = {}
  const the = []
  dong.forEach((d, i) => {
    if (!d.trim()) return
    if (d.startsWith('#')) {
      const [k, ...r] = d.slice(1).split(':')
      meta[k.trim()] = r.join(':').trim()
      return
    }
    the.push({ dong: i + 1, cot: d.split('\t') })
  })
  return { ten, meta, the }
}

// _pending.tsv co 4 cot (cot cuoi la file dich) nen kiem theo luat rieng
const files = readdirSync(ANKI)
  .filter((f) => f.endsWith('.tsv') && f !== '_pending.tsv')
  .sort()
if (!files.length) {
  console.error('khong tim thay file .tsv nao trong anki/')
  process.exit(1)
}
const boThe = files.map(docTheTsv)
const cho = existsSync(join(ANKI, '_pending.tsv')) ? docTheTsv('_pending.tsv') : null
const tongThe = boThe.reduce((s, b) => s + b.the.length, 0)

// ---------- 1. ky thuat ----------

console.log('KY THUAT')
for (const { ten, meta, the } of boThe) {
  const laCloze = (meta.notetype || '').toLowerCase() === 'cloze'
  for (const { dong, cot } of the) {
    if (cot.length !== 3) {
      console.log(`  LOI ${ten}:${dong} — ${cot.length} cot, phai la 3`)
      loi++
    }
    if (laCloze && !/\{\{c\d+::/.test(cot[0])) {
      console.log(`  LOI ${ten}:${dong} — the Cloze thieu {{c1::...}}`)
      loi++
    }
    for (const [i, o] of cot.entries()) {
      if ((o || '').replace(TAG_HTML, '').includes('<')) {
        console.log(`  LOI ${ten}:${dong} cot ${i + 1} — dau < chua escape thanh &lt;`)
        loi++
      }
    }
  }
}
// file cho: 4 cot, cot cuoi phai la ten file .tsv co that
if (cho) {
  for (const { dong, cot } of cho.the) {
    if (cot.length !== 4) {
      console.log(`  LOI _pending.tsv:${dong} — ${cot.length} cot, phai la 4 (them cot file dich)`)
      loi++
    } else if (!files.includes(cot[3].trim())) {
      console.log(`  LOI _pending.tsv:${dong} — file dich khong ton tai: ${cot[3].trim()}`)
      loi++
    }
  }
}
if (!loi) console.log('  sach')

// ---------- 2. chat luong ----------

console.log('\nCHAT LUONG (4 luat trong anki/README.md)')
const YES_NO = /(có|được|phải)\s[^?]*không\s*\?/i
// "A hay B?" — bo qua trang tu tan suat ("hay bi", "hay gap") va "hay" trong trich dan
const NHI_PHAN = /\bhay\b(?!\s+(bị|gặp|dùng|được|xảy|nêu|mắc|bỏ))[^?"']{0,30}\?\s*$/i
// cau hoi mo: du co chu "hay" van khong phai nhi phan
const MO = /vì sao|tại sao|thế nào|ra sao|bằng gì|cách nào|phép thử|câu nào|nguyên tắc/i

const deKiemChatLuong = [...boThe, ...(cho ? [cho] : [])]
for (const { ten, meta, the } of deKiemChatLuong) {
  if ((meta.notetype || '').toLowerCase() === 'cloze') continue
  for (const { dong, cot } of the) {
    const mat_truoc = (cot[0] || '').replace(TAG_HTML, '')
    const mat_sau = (cot[1] || '').replace(TAG_HTML, '')

    if (YES_NO.test(mat_truoc) && !MO.test(mat_truoc) && !/^đo gì/i.test(mat_truoc)) {
      console.log(`  ! ${ten}:${dong} — cau yes/no, doan bua van dung 50%`)
      canh++
    }
    if (NHI_PHAN.test(mat_truoc) && !MO.test(mat_truoc)) {
      console.log(`  ! ${ten}:${dong} — cau nhi phan "A hay B"`)
      canh++
    }
    if (mat_sau.length > 300) {
      console.log(`  ! ${ten}:${dong} — mat sau ${mat_sau.length} ky tu (>300), the dang ganh nhieu y`)
      canh++
    }
    if (!/<small>/.test(cot[1] || '')) {
      console.log(`  ! ${ten}:${dong} — thieu <small>duong-dan-nguon</small> o mat sau`)
      canh++
    }
  }
}
if (!canh) console.log('  sach')

// ---------- 3. do phu ----------

function motFileMd(thuMuc, ra = []) {
  for (const t of readdirSync(thuMuc)) {
    const p = join(thuMuc, t)
    if (statSync(p).isDirectory()) motFileMd(p, ra)
    else if (t.endsWith('.md')) ra.push(p)
  }
  return ra
}

// Khong sinh the cho: cheatsheet (trung noi dung file goc — mot kien thuc mot cho)
// va tutorial (bai tap de LAM, khong phai kien thuc de NHO).
const BO_QUA_DOC_TYPE = ['cheatsheet', 'tutorial', 'index']
const boQua = []

// file docs co noi dung that: co it nhat mot muc "## " va khong phai index/catalog
const fileDocs = motFileMd(DOCS)
  .filter((p) => !/index\.md$|catalog\.md$/.test(p))
  .filter((p) => /^## /m.test(readFileSync(p, 'utf8')))
  .filter((p) => {
    const dt = readFileSync(p, 'utf8').match(/^doc_type:\s*(\S+)/m)?.[1]
    if (dt && BO_QUA_DOC_TYPE.includes(dt)) {
      boQua.push(`${relative(ROOT, p)} (doc_type: ${dt})`)
      return false
    }
    return true
  })
  .map((p) => relative(ROOT, p))

// nguon ma the tham chieu toi, vd "reference/grain.md"
const nguon = new Set()
for (const { the } of [...boThe, ...(cho ? [cho] : [])]) {
  for (const { cot } of the) {
    for (const m of (cot[1] || '').matchAll(NGUON)) {
      for (const phan of m[1].split('·')) nguon.add(phan.trim())
    }
  }
}

const chuaPhu = fileDocs.filter((f) => ![...nguon].some((n) => f.endsWith(n)))

console.log('\nDO PHU')
console.log(`  ${fileDocs.length - chuaPhu.length}/${fileDocs.length} file docs da co the`)
if (boQua.length) console.log(`  (bo qua ${boQua.length} file: ${BO_QUA_DOC_TYPE.join(', ')})`)
if (chuaPhu.length) {
  console.log('  chua co the nao tro toi:')
  for (const f of chuaPhu) console.log(`    ${f}`)
}

// file sua sau lan sinh the gan nhat
function moiNhat(duongDan) {
  try {
    return execSync(`git log -1 --format=%ct -- "${duongDan}"`, { cwd: ROOT }).toString().trim()
  } catch {
    return ''
  }
}
const mocThe = Math.max(...files.map((f) => statSync(join(ANKI, f)).mtimeMs)) / 1000
const daSua = fileDocs.filter((f) => {
  if (chuaPhu.includes(f)) return false
  const t = Number(moiNhat(f))
  return t && t > mocThe
})
if (daSua.length) {
  console.log('  sua sau lan sinh the gan nhat (the co the da cu):')
  for (const f of daSua) console.log(`    ${f}`)
}

// ---------- tong ket ----------

const pending = join(ANKI, '_pending.tsv')
console.log(`\n${tongThe} the — ${loi} loi, ${canh} canh bao`)
if (existsSync(pending)) {
  const n = readFileSync(pending, 'utf8').split('\n').filter((d) => d.trim() && !d.startsWith('#')).length
  console.log(`_pending.tsv dang cho duyet: ${n} the — sua xong thi chay: npm run anki:accept`)
}

process.exit(loi > 0 || canh > 0 ? 1 : 0)
