#!/usr/bin/env node
/**
 * Gop the da duyet trong anki/_pending.tsv vao cac file the chinh.
 *
 * _pending.tsv dung cot thu 4 de bao the nay thuoc file nao:
 *   mat_truoc <TAB> mat_sau <TAB> tags <TAB> data-modeling-basic.tsv
 *
 * Xoa mot dong trong _pending.tsv = loai the do. Sua truc tiep cung duoc.
 * Gop xong thi _pending.tsv duoc don sach.
 *
 * Chay: npm run anki:accept
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const ANKI = join(ROOT, 'anki')
const PENDING = join(ANKI, '_pending.tsv')

if (!existsSync(PENDING)) {
  console.log('khong co anki/_pending.tsv — khong co gi de gop')
  process.exit(0)
}

const dong = readFileSync(PENDING, 'utf8').split('\n')
const the = dong.filter((d) => d.trim() && !d.startsWith('#'))

if (!the.length) {
  console.log('_pending.tsv rong — khong co gi de gop')
  process.exit(0)
}

// gom theo file dich
const theoFile = new Map()
const hong = []

for (const [i, d] of the.entries()) {
  const cot = d.split('\t')
  if (cot.length !== 4) {
    hong.push(`dong ${i + 1}: ${cot.length} cot, phai la 4 (mat_truoc, mat_sau, tags, file_dich)`)
    continue
  }
  const dich = cot[3].trim()
  if (!/^[a-z-]+\.tsv$/.test(dich) || !existsSync(join(ANKI, dich))) {
    hong.push(`dong ${i + 1}: file dich khong hop le — ${dich}`)
    continue
  }
  if (!theoFile.has(dich)) theoFile.set(dich, [])
  theoFile.get(dich).push(cot.slice(0, 3).join('\t'))
}

if (hong.length) {
  console.error('KHONG GOP — sua nhung dong nay trong _pending.tsv truoc:')
  for (const h of hong) console.error(`  ${h}`)
  process.exit(1)
}

// chong trung: bo the co mat truoc da ton tai
let tong = 0
let boQua = 0

for (const [dich, dsThe] of theoFile) {
  const duong = join(ANKI, dich)
  const daCo = new Set(
    readFileSync(duong, 'utf8')
      .split('\n')
      .filter((d) => d.trim() && !d.startsWith('#'))
      .map((d) => d.split('\t')[0])
  )

  const moi = dsThe.filter((d) => {
    const truoc = d.split('\t')[0]
    if (daCo.has(truoc)) {
      boQua++
      return false
    }
    daCo.add(truoc)
    return true
  })

  if (moi.length) {
    const noi = readFileSync(duong, 'utf8')
    appendFileSync(duong, (noi.endsWith('\n') ? '' : '\n') + moi.join('\n') + '\n')
    console.log(`  ${dich.padEnd(28)} +${moi.length} the`)
    tong += moi.length
  }
}

writeFileSync(PENDING, '')
console.log(`\ngop ${tong} the${boQua ? `, bo qua ${boQua} the trung mat truoc` : ''}`)
console.log('_pending.tsv da don sach')
console.log('\nchay tiep:  npm run anki:check   roi   npm run anki:push')
