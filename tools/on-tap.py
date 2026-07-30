#!/usr/bin/env python3
"""Liệt kê ghi chú đến hạn ôn lại.

Đọc `next-review: YYYY-MM-DD` trong frontmatter của mọi file .md trong kho, so với
hôm nay. Không cần cài gì — chỉ dùng thư viện chuẩn.

    python3 tools/on-tap.py          # cái đã đến hạn
    python3 tools/on-tap.py --all    # kèm cả lịch sắp tới
"""

from __future__ import annotations

import re
import sys
from datetime import date, datetime
from pathlib import Path

KHO = Path(__file__).resolve().parent.parent
BO_QUA = {".git", ".obsidian", "node_modules", "99-templates"}

# Mốc ôn giãn cách. Nhớ được thì đẩy sang mốc sau, quên thì lùi về mốc đầu.
MOC_NGAY = [1, 3, 7, 21, 60]


def doc_frontmatter(path: Path) -> dict[str, str]:
    """Rút frontmatter YAML đơn giản (key: value) ở đầu file."""
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return {}
    if not text.startswith("---"):
        return {}
    ket = text.find("\n---", 3)
    if ket == -1:
        return {}
    meta: dict[str, str] = {}
    for dong in text[3:ket].splitlines():
        khop = re.match(r"^([A-Za-z_-]+):\s*(.*)$", dong.strip())
        if khop:
            meta[khop.group(1)] = khop.group(2).strip()
    return meta


def quet() -> list[tuple[date, Path, str]]:
    ket_qua = []
    for path in KHO.rglob("*.md"):
        if BO_QUA & set(path.relative_to(KHO).parts):
            continue
        meta = doc_frontmatter(path)
        raw = meta.get("next-review", "")
        if not raw:
            continue
        try:
            han = datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            print(f"⚠  {path.relative_to(KHO)}: next-review không đúng dạng YYYY-MM-DD ({raw!r})")
            continue
        ket_qua.append((han, path, meta.get("level", "—")))
    return sorted(ket_qua)


def main() -> int:
    hom_nay = date.today()
    tat_ca = quet()
    den_han = [r for r in tat_ca if r[0] <= hom_nay]
    sap_toi = [r for r in tat_ca if r[0] > hom_nay]

    if den_han:
        print(f"\n📌 Đến hạn ôn ({hom_nay:%d/%m/%Y}) — {len(den_han)} mục\n")
        for han, path, bac in den_han:
            tre = (hom_nay - han).days
            nhan = "hôm nay" if tre == 0 else f"trễ {tre} ngày"
            print(f"  [{bac:2}] {path.relative_to(KHO)}  ({nhan})")
        print(
            "\n  Cách ôn: GẤP tài liệu, trả lời mục 'Tự kiểm' bằng miệng, rồi mới mở đối chiếu."
            f"\n  Nhớ được → đẩy next-review sang mốc sau ({'/'.join(map(str, MOC_NGAY))} ngày)."
            "\n  Quên → lùi về mốc đầu (1 ngày).\n"
        )
    else:
        print(f"\n✅ Hôm nay không có gì đến hạn ôn ({hom_nay:%d/%m/%Y}).\n")

    if sap_toi and "--all" in sys.argv:
        print(f"🗓  Sắp tới — {len(sap_toi)} mục\n")
        for han, path, bac in sap_toi:
            print(f"  [{bac:2}] {path.relative_to(KHO)}  → {han:%d/%m}  (còn {(han - hom_nay).days} ngày)")
        print()

    if not tat_ca:
        print("  (Chưa file nào có `next-review` trong frontmatter — xem 50-learning/README.md)\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
