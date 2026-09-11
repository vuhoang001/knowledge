#!/usr/bin/env bash
#
# Dung lab dbt + DuckDB tu so khong.
#
#   ./lab-starter/setup.sh              # dung vao ~/learn-lab/dbt
#   ./lab-starter/setup.sh /duong/dan   # dung vao cho khac
#
# Lab co tinh nam NGOAI repo: `dbt run` sinh ra target/, logs/, lab.duckdb —
# thu rac khong nen lan vao kho kien thuc.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${1:-$HOME/learn-lab/dbt}"

echo "==> Lab se nam o: $DEST"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Thieu python3. Cai truoc roi chay lai." >&2
  exit 1
fi

mkdir -p "$DEST"
cp -r "$SRC/seeds" "$DEST/"
cp "$SRC/dbt_project.yml" "$SRC/profiles.yml" "$DEST/"
mkdir -p "$DEST/models" "$DEST/snapshots" "$DEST/tests" "$DEST/macros"

echo "==> Tao venv"
python3 -m venv "$DEST/.venv"

echo "==> Cai dbt-duckdb (vai phut lan dau)"
"$DEST/.venv/bin/pip" install --quiet --upgrade pip
"$DEST/.venv/bin/pip" install --quiet 'dbt-duckdb>=1.9' duckdb

echo "==> Kiem ket noi"
cd "$DEST"
./.venv/bin/dbt debug --profiles-dir .

echo "==> Nap 15 bang seed"
./.venv/bin/dbt seed --profiles-dir .

echo
echo "==> Bon so moc — phai ra dung 10 / 15 / 10215000 / 400000"
./.venv/bin/python - <<'PY'
import duckdb
con = duckdb.connect('lab.duckdb')
print(con.sql("""
  select (select count(*) from don_hang)                          so_don,
         (select count(*) from don_hang_chi_tiet)                 so_dong,
         (select sum(so_luong*don_gia) from don_hang_chi_tiet)    doanh_thu,
         (select sum(phi_ship) from don_hang)                     phi_ship
"""))
PY

echo
echo "Xong. Tu day tro di:"
echo "    cd $DEST"
echo "    ./.venv/bin/dbt seed --profiles-dir .     # nap lai seed"
echo "    ./.venv/bin/python -c \"import duckdb;print(duckdb.connect('lab.duckdb').sql('show tables'))\""
echo
echo "Muon shell SQL tuong tac thi cai them DuckDB CLI (khong bat buoc):"
echo "    https://duckdb.org/docs/installation/"
