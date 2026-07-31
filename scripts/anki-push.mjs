#!/usr/bin/env node
/**
 * Day the tu cac file .tsv thang vao Anki DANG MO, qua add-on AnkiConnect.
 * Khong phai dong Anki, khong phai File -> Import.
 *
 * AnkiConnect tu bo qua note trung mat truoc, nen chay lai nhieu lan vo hai.
 *
 * Chay: npm run anki:push            (day tat ca)
 *       npm run anki:push -- --dry   (chi xem se day bao nhieu, khong ghi)
 *       npm run anki:push -- --prune (them: xoa the trong Anki khong con trong TSV)
 *
 * --prune giai quyet ca sua MAT TRUOC cua mot the: ban moi vao, ban cu bi don di.
 * Khong co no thi hai ban cung ton tai va ban se on ca the da bo.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const ANKI = join(ROOT, 'anki')
const URL_CONNECT = 'http://127.0.0.1:8765'
const DRY = process.argv.includes('--dry')
const PRUNE = process.argv.includes('--prune')

async function goi(action, params = {}) {
  let res
  try {
    res = await fetch(URL_CONNECT, {
      method: 'POST',
      body: JSON.stringify({ action, version: 6, params }),
    })
  } catch {
    console.error('Khong ket noi duoc AnkiConnect o ' + URL_CONNECT)
    console.error('')
    console.error('  1. Anki phai DANG MO')
    console.error('  2. Phai cai add-on AnkiConnect (ma 2055492159)')
    console.error('     Anki -> Cong cu -> Add-ons -> Get Add-ons -> dan ma -> khoi dong lai Anki')
    process.exit(1)
  }
  const kq = await res.json()
  if (kq.error) throw new Error(`AnkiConnect: ${kq.error}`)
  return kq.result
}

function docTsv(ten) {
  const meta = {}
  const the = []
  for (const d of readFileSync(join(ANKI, ten), 'utf8').split('\n')) {
    if (!d.trim()) continue
    if (d.startsWith('#')) {
      const [k, ...r] = d.slice(1).split(':')
      meta[k.trim()] = r.join(':').trim()
      continue
    }
    the.push(d.split('\t'))
  }
  return { meta, the }
}

const files = readdirSync(ANKI)
  .filter((f) => f.endsWith('.tsv') && f !== '_pending.tsv')
  .sort()

const ver = await goi('version')
console.log(`AnkiConnect v${ver} — da ket noi\n`)

let tongThem = 0
let tongTrung = 0
const matTruocTrongTsv = new Set()
const deckDaCham = new Set()

for (const ten of files) {
  const { meta, the } = docTsv(ten)
  deckDaCham.add(meta.deck)
  for (const cot of the) matTruocTrongTsv.add((cot[0] || '').trim())
  const notetype = meta.notetype
  const deck = meta.deck
  const cotTag = Number(meta['tags column'] || 3) - 1

  await goi('createDeck', { deck })

  const truong = notetype.toLowerCase() === 'cloze' ? ['Text', 'Back Extra'] : ['Front', 'Back']

  const notes = the.map((cot) => ({
    deckName: deck,
    modelName: notetype,
    fields: { [truong[0]]: cot[0] || '', [truong[1]]: cot[1] || '' },
    tags: (cot[cotTag] || '').split(/\s+/).filter(Boolean),
    options: { allowDuplicate: false, duplicateScope: 'deck' },
  }))

  // Loc truoc bang canAddNotes: addNotes nem loi neu ca lo deu trung
  const cothe = await goi('canAddNotes', { notes })
  const moi = notes.filter((_, i) => cothe[i])
  const trung = notes.length - moi.length

  if (DRY) {
    console.log(`  ${ten.padEnd(28)} ${moi.length} the moi / ${notes.length}`)
  } else if (moi.length) {
    await goi('addNotes', { notes: moi })
    console.log(`  ${ten.padEnd(28)} +${moi.length} the${trung ? `, ${trung} da co` : ''}`)
  } else {
    console.log(`  ${ten.padEnd(28)} khong co the moi (${trung} da co)`)
  }

  tongThem += moi.length
  tongTrung += trung
}

console.log(
  `\n${DRY ? '[dry-run] se them' : 'da them'} ${tongThem} the` +
    (tongTrung ? `, ${tongTrung} the da co san` : '')
)

// ---------- prune: don the trong Anki khong con trong TSV ----------

if (PRUNE) {
  const mo = [...deckDaCham].map((d) => `deck:"${d}"`).join(' OR ')
  const ids = await goi('findNotes', { query: mo })
  const info = await goi('notesInfo', { notes: ids })

  const thua = info.filter((n) => {
    const f = Object.values(n.fields)[0]?.value ?? ''
    return !matTruocTrongTsv.has(f.trim())
  })

  if (!thua.length) {
    console.log('prune: khong co the thua')
  } else if (DRY) {
    console.log(`\n[dry-run] prune se xoa ${thua.length} the khong con trong TSV:`)
    for (const n of thua.slice(0, 10)) {
      console.log(`    ${Object.values(n.fields)[0].value.replace(/<[^>]*>/g, '').slice(0, 70)}`)
    }
    if (thua.length > 10) console.log(`    ... va ${thua.length - 10} the nua`)
  } else {
    await goi('deleteNotes', { notes: thua.map((n) => n.noteId) })
    console.log(`prune: da xoa ${thua.length} the khong con trong TSV`)
  }
}

if (!DRY && tongThem) {
  await goi('sync').catch(() => {})
  console.log('da goi dong bo AnkiWeb (bo qua neu chua dang nhap)')
}
