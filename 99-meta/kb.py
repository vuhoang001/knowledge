#!/usr/bin/env python3
"""kb — Learning OS giai đoạn 1.

Chỉ mục DẪN XUẤT từ Markdown. Xoá kb.sqlite đi rồi `kb index` là dựng lại y nguyên —
Markdown + review-log.jsonl là nguồn sự thật duy nhất (xem learning-os.md §0.1).

    python3 99-meta/kb.py index              quét .md → SQLite
    python3 99-meta/kb.py due                hôm nay ôn gì
    python3 99-meta/kb.py review <id> <0-3>  ghi một lượt ôn (0 quên · 3 dễ)
    python3 99-meta/kb.py path <id>          thứ tự học để tới được <id>
    python3 99-meta/kb.py doctor             chu trình · mồ côi · seed cũ · link chết
    python3 99-meta/kb.py stats              tổng quan

Chỉ dùng thư viện chuẩn. Không dịch vụ, không cài gì.
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

KHO = Path(__file__).resolve().parent.parent
DB = KHO / "99-meta" / "kb.sqlite"
LOG = KHO / "99-meta" / "review-log.jsonl"
BO_QUA = {".git", ".obsidian", "node_modules"}
BO_QUA_FILE = ("tmpl-",)   # khuôn mẫu không phải node tri thức

# SM-2 rút gọn. grade: 0 quên hẳn · 1 khó · 2 được · 3 dễ.
EASE_DAU = 2.5
SEED_QUA_HAN_NGAY = 30      # seed để lâu hơn ngần này = kiến thức giả đang tích lại
STALE_THANG = 12            # verified_at cũ hơn ngần này = nghi đã sai


# ─────────────────────────────── đọc Markdown ────────────────────────────────

def tach_frontmatter(text: str) -> tuple[dict, str]:
    """Trả (meta, thân bài). Parser YAML tối giản: scalar + list inline.

    Không dùng pyyaml để kho chạy được trên máy trắng. Cấu trúc lồng (sources:)
    bị bỏ qua có chủ ý — index không cần tới, thân bài vẫn giữ nguyên.
    """
    if not text.startswith("---"):
        return {}, text
    ket = text.find("\n---", 3)
    if ket == -1:
        return {}, text
    meta: dict = {}
    for dong in text[3:ket].splitlines():
        if not dong.strip() or dong.startswith((" ", "\t", "-", "#")):
            continue
        khop = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$", dong)
        if not khop:
            continue
        khoa, gia_tri = khop.group(1), khop.group(2).strip()
        # Cắt comment cuối dòng TRƯỚC khi phân tích. Bỏ bước này thì
        # `prereqs: []   # ghi chú` không còn kết thúc bằng `]` → bị coi là chuỗi,
        # rồi vòng lặp cạnh duyệt nó TỪNG KÝ TỰ và sinh ra hàng chục node rác.
        if "#" in gia_tri and not gia_tri.startswith("#"):
            gia_tri = gia_tri.split("#", 1)[0].strip()
        if gia_tri.startswith("[") and gia_tri.endswith("]"):
            meta[khoa] = [p.strip() for p in gia_tri[1:-1].split(",") if p.strip()]
        elif gia_tri:
            meta[khoa] = gia_tri
    return meta, text[ket + 4:]


def cat_chunk(than: str) -> list[tuple[str, str]]:
    """Cắt theo heading `##` — Markdown đã có ranh giới ngữ nghĩa sẵn, cắt theo
    số token cố định sẽ xẻ đôi bảng khái niệm (learning-os.md §9)."""
    ra, heading, buf = [], "", []
    for dong in than.splitlines():
        if dong.startswith("## "):
            if buf:
                ra.append((heading, "\n".join(buf).strip()))
            heading, buf = dong[3:].strip(), []
        else:
            buf.append(dong)
    if buf:
        ra.append((heading, "\n".join(buf).strip()))
    return [(h, b) for h, b in ra if b]


def quet() -> list[dict]:
    ho_so = []
    for path in sorted(KHO.rglob("*.md")):
        if BO_QUA & set(path.relative_to(KHO).parts) or path.name.startswith(BO_QUA_FILE):
            continue
        text = path.read_text(encoding="utf-8")
        meta, than = tach_frontmatter(text)
        rel = str(path.relative_to(KHO))
        # File không khai `id` thì lấy tên file — README của thư mục lấy tên thư mục.
        mac_dinh = path.parent.name if path.stem == "README" else path.stem
        ho_so.append({
            "id": meta.get("id", mac_dinh),
            "path": rel,
            "title": meta.get("title", ""),
            "type": meta.get("type", ""),
            "status": meta.get("status", ""),
            "difficulty": meta.get("difficulty"),
            "est_hours": meta.get("est_hours"),
            "updated": meta.get("updated", ""),
            "verified_at": meta.get("verified_at", ""),
            "prereqs": meta.get("prereqs", []),
            "related": meta.get("related", []),
            # Hai kiểu liên kết cùng tồn tại trong kho: [[wikilink]] và link Markdown
            # thường. Bỏ sót kiểu thứ hai thì `doctor` báo mồ côi hàng loạt oan.
            "links": (re.findall(r"\[\[([^\]|#]+)", than)
                      + [Path(m).stem if Path(m).stem != "README" else Path(m).parent.name
                         for m in re.findall(r"\]\(([^)]+?\.md)[^)]*\)", than)]),
            "chunks": cat_chunk(than),
        })
    return ho_so


# ──────────────────────────────── chỉ mục ────────────────────────────────────

def mo_db() -> sqlite3.Connection:
    con = sqlite3.connect(DB)
    con.executescript("""
    CREATE TABLE IF NOT EXISTS node(id TEXT PRIMARY KEY, path TEXT, title TEXT,
        type TEXT, status TEXT, difficulty INT, est_hours REAL,
        updated TEXT, verified_at TEXT);
    CREATE TABLE IF NOT EXISTS edge(src TEXT, dst TEXT, kind TEXT);
    CREATE TABLE IF NOT EXISTS chunk(node_id TEXT, heading TEXT, body TEXT, ord INT);
    CREATE VIRTUAL TABLE IF NOT EXISTS chunk_fts USING fts5(heading, body, node_id);
    """)
    return con


def lenh_index() -> int:
    ho_so = quet()
    con = mo_db()
    con.executescript("DELETE FROM node; DELETE FROM edge; "
                      "DELETE FROM chunk; DELETE FROM chunk_fts;")
    for f in ho_so:
        con.execute("INSERT OR REPLACE INTO node VALUES (?,?,?,?,?,?,?,?,?)", (
            f["id"], f["path"], f["title"], f["type"], f["status"],
            int(f["difficulty"]) if str(f["difficulty"] or "").isdigit() else None,
            float(f["est_hours"]) if str(f["est_hours"] or "").replace(".", "").isdigit() else None,
            f["updated"], f["verified_at"]))
        for kind, ds in (("prereq", f["prereqs"]), ("related", f["related"]),
                         ("link", f["links"])):
            # Chặn tầng hai: giá trị vô hình trung là chuỗi sẽ bị duyệt từng ký tự.
            if isinstance(ds, str):
                ds = [ds]
            for dst in ds:
                con.execute("INSERT INTO edge VALUES (?,?,?)", (f["id"], dst, kind))
        for i, (h, b) in enumerate(f["chunks"]):
            con.execute("INSERT INTO chunk VALUES (?,?,?,?)", (f["id"], h, b, i))
            con.execute("INSERT INTO chunk_fts VALUES (?,?,?)", (h, b, f["id"]))
    con.commit()
    n_edge = con.execute("SELECT count(*) FROM edge").fetchone()[0]
    n_chunk = con.execute("SELECT count(*) FROM chunk").fetchone()[0]
    print(f"✓ {len(ho_so)} node · {n_edge} cạnh · {n_chunk} chunk → {DB.name}")
    con.close()
    return 0


# ──────────────────────── ôn tập: replay log → trạng thái ────────────────────

def doc_log() -> list[dict]:
    if not LOG.exists():
        return []
    su_kien = []
    for dong in LOG.read_text(encoding="utf-8").splitlines():
        dong = dong.strip()
        if dong:
            try:
                su_kien.append(json.loads(dong))
            except json.JSONDecodeError:
                print(f"⚠  bỏ qua dòng hỏng trong review-log.jsonl: {dong[:60]}")
    return sorted(su_kien, key=lambda e: e.get("ts", ""))


def replay() -> dict[str, dict]:
    """Trạng thái ôn tập là KẾT QUẢ PHÁT LẠI log, không phải thứ sửa tại chỗ.
    Đổi thuật toán thì replay lại, không mất dữ liệu (learning-os.md §5)."""
    tt: dict[str, dict] = {}
    for e in doc_log():
        item, grade = e.get("item"), int(e.get("grade", 0))
        if not item:
            continue
        s = tt.setdefault(item, {"ease": EASE_DAU, "interval": 0, "reps": 0,
                                 "lapses": 0, "due": None, "lan_cuoi": None})
        if grade < 2:
            s["reps"], s["interval"] = 0, 1
            s["lapses"] += 1
        else:
            s["interval"] = 1 if s["reps"] == 0 else 3 if s["reps"] == 1 \
                else max(1, round(s["interval"] * s["ease"]))
            s["reps"] += 1
        s["ease"] = max(1.3, s["ease"] + 0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02))
        moc = datetime.fromisoformat(e["ts"]).date()
        s["lan_cuoi"], s["due"] = moc, moc + timedelta(days=s["interval"])
    return tt


def lenh_due() -> int:
    tt, hom_nay = replay(), date.today()
    den_han = sorted(((s["due"], i, s) for i, s in tt.items() if s["due"] <= hom_nay))
    if not den_han:
        sap = sorted((s["due"], i) for i, s in tt.items())
        print(f"\n✅ Hôm nay không có gì đến hạn ({hom_nay:%d/%m/%Y}).\n")
        if sap:
            d, i = sap[0]
            print(f"   Gần nhất: {i} → {d:%d/%m} (còn {(d - hom_nay).days} ngày)\n")
        else:
            print("   (Chưa có lượt ôn nào. Ôn xong thì: kb.py review <id> <0-3>)\n")
        return 0
    print(f"\n📌 Đến hạn ôn ({hom_nay:%d/%m/%Y}) — {len(den_han)} mục\n")
    for d, i, s in den_han:
        tre = (hom_nay - d).days
        print(f"  {i:32} {'hôm nay' if tre == 0 else f'trễ {tre} ngày':>12}"
              f"   ease {s['ease']:.2f} · quên {s['lapses']}x")
    print("\n  GẤP tài liệu → trả lời mục 'Tự kiểm' bằng miệng → mới mở đối chiếu."
          "\n  Chấm: kb.py review <id> <0 quên · 1 khó · 2 được · 3 dễ>\n")
    return 0


def lenh_review(item: str, grade: int) -> int:
    if not 0 <= grade <= 3:
        print("grade phải trong 0..3"); return 1
    LOG.parent.mkdir(exist_ok=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"ts": datetime.now().isoformat(timespec="seconds"),
                            "item": item, "grade": grade, "mode": "concept"},
                           ensure_ascii=False) + "\n")
    s = replay().get(item, {})
    print(f"✓ {item} · grade {grade} → ôn lại {s.get('due')} "
          f"(sau {s.get('interval')} ngày, ease {s.get('ease', 0):.2f})")
    return 0


# ─────────────────────────── đồ thị: lộ trình + doctor ───────────────────────

def canh_prereq(con) -> dict[str, list[str]]:
    g = defaultdict(list)
    for src, dst in con.execute("SELECT src, dst FROM edge WHERE kind='prereq'"):
        g[src].append(dst)
    return g


def lenh_path(dich: str) -> int:
    con = mo_db()
    co = {r[0] for r in con.execute("SELECT id FROM node")}
    if dich not in co:
        print(f"Không có node `{dich}`. Chạy `index` trước, hoặc xem `stats`."); return 1
    g = canh_prereq(con)
    can, ngan_xep = set(), [dich]
    while ngan_xep:                                  # bao đóng prereq
        n = ngan_xep.pop()
        if n in can:
            continue
        can.add(n)
        ngan_xep.extend(g.get(n, []))

    thu_tu, dang_xet = [], set()
    def tham(n):                                     # sắp topo, prereq ra trước
        if n in thu_tu or n in dang_xet:
            return
        dang_xet.add(n)
        for p in g.get(n, []):
            tham(p)
        dang_xet.discard(n)
        thu_tu.append(n)
    tham(dich)

    print(f"\n🎯 Lộ trình tới `{dich}` — {len(thu_tu)} bước\n")
    for i, n in enumerate(thu_tu, 1):
        r = con.execute("SELECT status, path FROM node WHERE id=?", (n,)).fetchone()
        if r:
            print(f"  {i}. {n:28} [{r[0] or 'seed':9}] {r[1]}")
        else:
            print(f"  {i}. {n:28} [THIẾU]    ← chưa có module, cần tạo")
    print()
    con.close()
    return 0


def lenh_doctor() -> int:
    con, hom_nay, van_de = mo_db(), date.today(), 0
    co = {r[0] for r in con.execute("SELECT id FROM node")}
    g = canh_prereq(con)

    print("\n🩺 kb doctor\n")

    thieu = sorted({d for ds in g.values() for d in ds} - co)
    if thieu:
        van_de += len(thieu)
        print(f"  ✗ prereq trỏ tới module CHƯA CÓ ({len(thieu)}):")
        for t in thieu:
            print(f"      {t}")

    mau, xong, chu_trinh = set(), set(), []
    def dfs(n, duong):
        if n in xong:
            return
        if n in mau:
            chu_trinh.append(" → ".join(duong[duong.index(n):] + [n])); return
        mau.add(n)
        for p in g.get(n, []):
            dfs(p, duong + [p])
        mau.discard(n); xong.add(n)
    for n in list(co):
        dfs(n, [n])
    if chu_trinh:
        van_de += len(chu_trinh)
        print(f"  ✗ CHU TRÌNH trong prereq — không học được ({len(chu_trinh)}):")
        for c in set(chu_trinh):
            print(f"      {c}")

    co_toi = {d for _, d, _ in con.execute("SELECT * FROM edge")}
    mo_coi = sorted(i for i, in con.execute(
        "SELECT id FROM node WHERE type IN ('module','note') AND path NOT LIKE '99-meta/%'")
        if i not in co_toi)
    if mo_coi:
        van_de += len(mo_coi)
        print(f"  ⚠ MỒ CÔI — không file nào trỏ tới, sẽ không tìm lại được ({len(mo_coi)}):")
        for m in mo_coi:
            print(f"      {m}")

    for i, st, up in con.execute(
            "SELECT id, status, updated FROM node WHERE status='seed'"):
        if up:
            try:
                if (hom_nay - datetime.strptime(up, "%Y-%m-%d").date()).days > SEED_QUA_HAN_NGAY:
                    van_de += 1
                    print(f"  ⚠ seed quá {SEED_QUA_HAN_NGAY} ngày (kiến thức giả đang tích): {i}")
            except ValueError:
                pass

    for i, v in con.execute(
            "SELECT id, verified_at FROM node WHERE verified_at != ''"):
        try:
            if (hom_nay - datetime.strptime(v, "%Y-%m-%d").date()).days > STALE_THANG * 30:
                van_de += 1
                print(f"  ⚠ STALE — verified_at quá {STALE_THANG} tháng: {i}")
        except ValueError:
            pass

    print(f"\n  {'✓ sạch' if not van_de else f'{van_de} vấn đề'}\n")
    con.close()
    return 0


def lenh_stats() -> int:
    con, tt = mo_db(), replay()
    tong = con.execute("SELECT count(*) FROM node").fetchone()[0]
    print(f"\n📊 {tong} node · {con.execute('SELECT count(*) FROM edge').fetchone()[0]} cạnh"
          f" · {con.execute('SELECT count(*) FROM chunk').fetchone()[0]} chunk\n")
    for nhan, sql in (("Theo loại", "SELECT type, count(*) FROM node GROUP BY type"),
                      ("Theo trạng thái", "SELECT status, count(*) FROM node GROUP BY status")):
        print(f"  {nhan}:")
        for k, v in con.execute(sql):
            print(f"    {k or '(chưa khai)':16} {v}")
    da_on = len(tt)
    print(f"\n  Đã ôn ít nhất 1 lần: {da_on}/{tong}"
          f" · tổng lượt ôn: {len(doc_log())}\n")
    con.close()
    return 0


# ──────────────────────────────────── main ───────────────────────────────────

def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__); return 1
    lenh, arg = sys.argv[1], sys.argv[2:]
    if lenh == "index":  return lenh_index()
    if lenh == "due":    return lenh_due()
    if lenh == "doctor": return lenh_doctor()
    if lenh == "stats":  return lenh_stats()
    if lenh == "path":
        if not arg: print("cần <id>"); return 1
        return lenh_path(arg[0])
    if lenh == "review":
        if len(arg) < 2: print("cần <id> <0-3>"); return 1
        return lenh_review(arg[0], int(arg[1]))
    print(__doc__); return 1


if __name__ == "__main__":
    raise SystemExit(main())
