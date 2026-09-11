---
title: Thiết lập CI/CD cho dbt project
sidebar_position: 10
description: "CI chạy lại cả 400 model mỗi PR thì không ai dùng. state:modified+ là thứ biến CI từ 40 phút thành 2 phút — và là lý do phải giữ manifest của production."
tags: [dbt, ci-cd, github-actions, state-modified, slim-ci, defer]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-09-11
---

# Thiết lập CI/CD cho dbt project

> **Chốt:** CI cho dbt chỉ có một ý tưởng cốt lõi — **so project hiện tại với
> `manifest.json` của production, rồi chỉ chạy phần đã đổi và phần phía sau nó**. Mọi
> thứ còn lại là chi tiết YAML.

## Mục tiêu học

Dựng được pipeline chặn merge khi model hỏng, chạy trong vài phút thay vì vài chục
phút, và không đụng vào dữ liệu production.

## Bước 1 — CI cho dbt phải chặn cái gì

| Loại lỗi | Bắt bằng | Chi phí |
|---|---|---|
| SQL sai cú pháp, `ref()` gõ nhầm | `dbt parse` | vài giây |
| Model không build được | `dbt run` trên schema CI | phút |
| Dữ liệu vi phạm luật | `dbt test` | phút |
| Vi phạm quy ước layer/đặt tên | `grep` trong CI | giây |
| Thiếu description ở marts | `dbt ls --output json` | giây |
| Thay đổi phá vỡ hợp đồng cột | `contract: {enforced: true}` | giây |

Xếp theo chi phí và **đặt cái rẻ lên trước** — fail sớm thì không tốn slot warehouse.

## Bước 2 — `state:modified` và vì sao nó đắt giá

dbt so `manifest.json` hiện tại với một manifest cũ để biết **cái gì đã đổi**.

```bash
mkdir -p prod_manifest && cp target/manifest.json prod_manifest/   # manifest của production
# ... sửa models/staging/stg_don_hang.sql ...
dbt ls --select state:modified+ --state ./prod_manifest
```

Output thật sau khi sửa **đúng một** model staging:

```text
Found 15 seeds, 6 models, 1 snapshot, 9 data tests, 1 source, 604 macros, 1 unit test
dbt_lab.marts.mart_doanh_thu_ngay
dbt_lab.staging.stg_don_hang
dbt_lab.staging.accepted_values_stg_don_hang_trang_thai__moi__dang_giao__hoan_thanh
dbt_lab.marts.khong_am_mart_doanh_thu_ngay_doanh_thu
dbt_lab.marts.not_null_mart_doanh_thu_ngay_ngay
dbt_lab.staging.not_null_stg_don_hang_don_hang_id
dbt_lab.staging.relationships_stg_don_hang_chi_tiet_don_hang_id__don_hang_id__ref_stg_don_hang_
dbt_lab.tong_mart_khop_staging
dbt_lab.marts.unique_mart_doanh_thu_ngay_ngay
dbt_lab.staging.unique_stg_don_hang_don_hang_id
unit_test:dbt_lab.mart_doanh_thu_ngay_gop_dung_ngay
```

Sửa một model → dbt tự suy ra **model phía sau nó và mọi test liên quan**. Trên project
400 model, `state:modified+` thường chọn vài chục thay vì tất cả. Đó là khác biệt giữa
CI 2 phút và CI 40 phút — và CI 40 phút là CI không ai chờ.

Cú pháp selector đi kèm:

| Selector | Chọn gì |
|---|---|
| `state:modified` | chỉ node đã đổi |
| `state:modified+` | node đã đổi **và mọi thứ phía sau** |
| `+state:modified` | node đã đổi và mọi thứ phía trước |
| `state:new` | node mới thêm |
| `--defer --state ./prod_manifest` | model chưa build ở CI thì **đọc từ production** |

`--defer` là mảnh thứ hai: nó cho phép build một model giữa DAG mà không phải build lại
toàn bộ phía trước — `ref()` tới model không có trong schema CI sẽ trỏ về production.

## Bước 3 — GitHub Actions hoàn chỉnh

```yaml
# .github/workflows/dbt-ci.yml
name: dbt CI
on:
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    env:
      DBT_PROFILES_DIR: ./ci
      SNOWFLAKE_ACCOUNT:  ${{ secrets.SNOWFLAKE_ACCOUNT }}
      SNOWFLAKE_USER:     ${{ secrets.SNOWFLAKE_CI_USER }}
      SNOWFLAKE_PASSWORD: ${{ secrets.SNOWFLAKE_CI_PASSWORD }}
      # Mỗi PR một schema riêng — chạy song song không giẫm chân nhau
      DBT_CI_SCHEMA: ci_pr_${{ github.event.pull_request.number }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.11'}

      - name: Cài dbt
        run: pip install dbt-core==1.12.0 dbt-snowflake==1.10.0

      - name: Cài package
        run: dbt deps

      # --- Tầng 1: rẻ, chạy trước, fail sớm ---
      - name: Parse
        run: dbt parse

      - name: Quy uoc layer
        run: |
          ! grep -rn --include='*.sql' -iE '\bjoin\b' models/staging/
          ! grep -rn --include='*.sql' 'source(' models/ | grep -v '^models/staging/'

      # --- Tầng 2: cần warehouse ---
      - name: Lay manifest cua production
        run: |
          mkdir -p prod_manifest
          aws s3 cp s3://cty-dbt-artifacts/prod/manifest.json prod_manifest/manifest.json

      - name: Build phan da doi
        run: |
          dbt build --select state:modified+ \
                    --defer --state ./prod_manifest \
                    --target ci

      - name: Don schema cua PR
        if: always()
        run: dbt run-operation drop_schema --args "{schema: $DBT_CI_SCHEMA}"
```

Bốn quyết định thiết kế trong file này:

1. **Mỗi PR một schema riêng** (`ci_pr_123`) — hai PR chạy cùng lúc không ghi đè nhau.
2. **Dọn schema ở bước cuối với `if: always()`** — CI fail vẫn phải dọn, nếu không
   warehouse đầy schema rác sau vài tháng.
3. **`manifest.json` của production tải từ S3** — nó là artifact của job production,
   không phải thứ có sẵn trong git.
4. **Pin phiên bản dbt** (`dbt-core==1.12.0`) — CI không được tự nâng phiên bản.

## Bước 4 — Job production

```yaml
# .github/workflows/dbt-prod.yml
name: dbt production
on:
  schedule: [{cron: '0 23 * * *'}]     # 23:00 UTC = 06:00 GMT+7
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install dbt-core==1.12.0 dbt-snowflake==1.10.0
      - run: dbt deps

      - name: Kiem do tuoi cua nguon
        run: dbt source freshness --target prod

      - name: Ghi lich su truoc
        run: dbt snapshot --target prod

      - name: Build
        run: dbt build --target prod --fail-fast

      - name: Sinh docs va day manifest len S3
        if: always()
        run: |
          dbt docs generate --target prod
          aws s3 cp target/manifest.json s3://cty-dbt-artifacts/prod/manifest.json
          aws s3 sync target/ s3://cty-dbt-docs/ --exclude '*' \
            --include 'index.html' --include 'manifest.json' --include 'catalog.json'
```

Thứ tự ba lệnh giữa là **bắt buộc, không đảo được**:

```text
source freshness  →  snapshot  →  build
```

`snapshot` phải chạy **trước** `build`, vì model marts đọc bảng snapshot. Đảo lại thì
báo cáo hôm nay dùng lịch sử của hôm qua — lệch một nhịp, và không lỗi nào báo.

## Bước 5 — `dbt build` chứ không phải `run` rồi `test`

```bash
dbt run && dbt test      # SAI trong production
dbt build                # ĐÚNG
```

Khác biệt: `dbt build` chạy **xen kẽ theo DAG** — model A build xong thì test của A
chạy ngay; A fail test thì mọi thứ phía sau A bị **skip**. Với `run && test`, toàn bộ
400 model đã build xong (bằng dữ liệu hỏng) rồi mới biết A sai.

Thêm `--fail-fast` để dừng ngay ở lỗi đầu tiên thay vì chạy tiếp các nhánh độc lập.

## Bước 6 — Bốn con số nên theo dõi

| Chỉ số | Lấy ở đâu | Ngưỡng đáng lo |
|---|---|---|
| Thời gian CI | log GitHub Actions | > 10 phút thì người ta bắt đầu merge bừa |
| Số model chạy mỗi CI | `dbt ls --select state:modified+ \| wc -l` | ~ tổng số model → `--state` hỏng |
| Test fail ở production | `run_results.json` | bất kỳ |
| Model chậm nhất | `run_results.json`, trường `execution_time` | top 5 chiếm > 50% tổng |

```bash
python - <<'PY'
import json
r = json.load(open('target/run_results.json'))
top = sorted(r['results'], key=lambda x: -x['execution_time'])[:5]
for t in top:
    print(f"{t['execution_time']:8.1f}s  {t['unique_id']}")
PY
```

## Lỗi thường gặp

| Lỗi | Hậu quả | Cách sửa |
|---|---|---|
| Không dùng `--state` | CI chạy cả project, 40 phút | Lưu manifest production làm artifact |
| CI chạy vào schema production | hỏng dữ liệu thật | Target `ci` riêng, database/schema riêng |
| Mọi PR dùng chung một schema CI | hai PR giẫm chân nhau | Schema theo số PR |
| Không dọn schema CI | warehouse đầy rác | Bước dọn `if: always()` |
| `dbt run && dbt test` | build xong hết rồi mới biết sai | `dbt build` |
| Quên `dbt deps` | `'dbt_utils' is undefined` | Thêm bước cài package |
| Không pin phiên bản dbt | CI đổi hành vi sau lưng | `dbt-core==1.12.0` |
| `--full-refresh` trong CI/job đêm | **mất lịch sử snapshot** | `--exclude resource_type:snapshot` |
| Bí mật nằm trong `profiles.yml` commit vào git | lộ credential | `env_var()` + secrets của CI |
| `dbt source freshness` chạy trong CI dev | CI đỏ vì dữ liệu mẫu cũ | Chỉ ở job production |

## Related Topics

- [dbt docs và lineage](../reference/docs-and-lineage.md) — `manifest.json` là ý định, `catalog.json` là hiện thực
- [dbt Core và dbt Cloud](../reference/dbt-core-vs-cloud.md) — Cloud bán sẵn mảnh CI này
- [Snapshot — bắt lịch sử thay đổi](snapshot-scd2.md) — vì sao snapshot phải chạy trước
- [Quản lý dependencies với package](quan-ly-package.md) — pin phiên bản
- [Bài tập nâng cao](../tutorials/bt-03-nang-cao.md) — bài N5
