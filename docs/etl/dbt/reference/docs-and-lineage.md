---
title: dbt docs và lineage
sidebar_position: 8
description: Sơ đồ lineage chính xác đúng bằng mức bạn dùng ref() kỷ luật.
tags: [dbt, docs, lineage, exposures]
domain: data-engineering
category: technology
doc_type: reference
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---
# Docs và lineage — rà tác động trước khi sửa

> **Chốt:** `dbt docs` không phải tính năng trang trí. Sơ đồ lineage là **cùng một
> DAG** mà dbt dùng để xếp thứ tự chạy — nên nó chính xác đúng bằng mức bạn dùng
> `ref()` kỷ luật. Viết tên bảng thẳng thì sơ đồ nói dối.


## `manifest.json` khác `catalog.json` chỗ nào

`dbt docs generate` sinh cả hai. Chúng trả lời hai câu hỏi khác hẳn nhau:

| | `manifest.json` | `catalog.json` |
|---|---|---|
| Trả lời | dbt **biết gì** về project của bạn | warehouse **thật sự có gì** |
| Sinh khi | mọi lệnh dbt | chỉ `dbt docs generate` |
| Nguồn | đọc file `.sql` và `.yml` | truy vấn `information_schema` |
| Kích thước thật | 756 KB | nhỏ hơn nhiều |

Đo trên project 4 model:

```text
manifest.json  nodes: 16 | sources: 1 | macros: 605
catalog.json   nodes: 7
```

`manifest` có 16 node vì nó đếm cả test, seed, snapshot, unit test. 605 macro là kể cả
macro của dbt và `dbt_utils`.

Bên trong một node của `manifest`:

```text
depends_on: ['seed.scratch.don_hang_chi_tiet']
description: Một dòng = **một dòng hàng trong một đơn**. Grain là cặp `(...)`
```

Bên trong cùng node đó ở `catalog`:

```text
cot that trong warehouse: don_hang_id, dong, ma_hang, so_luong, don_gia, thanh_tien, ngay
kieu cua thanh_tien: INTEGER
```

**`manifest` là ý định, `catalog` là hiện thực.** Lệch nhau nghĩa là model đã đổi mà chưa
chạy lại — và `dbt docs` hiển thị cả hai cạnh nhau nên nhìn ra ngay.

## Mô tả cột → hiện lên docs

```yaml
models:
  - name: stg_don_hang
    columns:
      - name: don_hang_id
        description: "Mã đơn hàng. KHÔNG unique — một đơn có nhiều dòng."
```

Mô tả này đi vào `manifest.json` rồi lên trang docs. Nó là chỗ **duy nhất** trả lời được
câu *"cột này nghĩa là gì"* mà không phải hỏi người viết.

### `{% raw %}{% docs %}{% endraw %}` — mô tả dài, dùng lại nhiều chỗ

Khai một lần trong `models/docs/docs.md`:

```markdown
{% raw %}{% docs mo_ta_grain %}
Một dòng = **một dòng hàng trong một đơn**. Grain là cặp `(don_hang_id, dong)`,
không phải `don_hang_id`.
{% enddocs %}{% endraw %}
```

Gọi ở bất kỳ đâu:

```yaml
    description: "{% raw %}{{ doc('mo_ta_grain') }}{% endraw %}"
```

Kiểm trong `manifest.json` sau `dbt docs generate` — nó đã render:

```text
description da render doc(): Một dòng = **một dòng hàng trong một đơn**. Grain là cặp `(d
```

Dùng khi cùng một định nghĩa xuất hiện ở nhiều model. Sửa một chỗ, mọi nơi đổi theo —
đúng nguyên tắc một kiến thức một chỗ.

## `dbt docs serve` — và host cho cả nhóm

```bash
dbt docs generate    # sinh manifest.json + catalog.json + index.html
dbt docs serve       # mở web server cục bộ, mặc định cổng 8080
```

`dbt docs serve` chỉ chạy trên máy bạn. Muốn cả nhóm xem thì **trang này là tĩnh** — đẩy
`target/index.html` + hai file JSON lên bất kỳ static host nào: GitHub Pages, S3, nginx.
Thường gắn vào CI: mỗi lần merge vào `main` thì sinh lại và deploy.

## `state:modified` — CI chỉ chạy phần đổi

Đây là lý do thực dụng nhất để quan tâm tới `manifest.json`.

Lưu manifest của lần chạy trước, sửa **một** model, rồi so:

```bash
cp target/manifest.json state/
# sửa models/staging/stg_don_hang.sql
dbt ls --select state:modified+ --state state --resource-type model
```

```text
scratch.marts.mart_doanh_thu_ngay
scratch.marts.mart_jinja
scratch.staging.stg_don_hang
```

So với chạy tất cả:

```text
scratch.marts.mart_doanh_thu_ngay
scratch.marts.mart_jinja
scratch.staging.stg_don_hang
scratch.staging.stg_hang_hoa
```

**3 thay vì 4.** `stg_hang_hoa` không đổi và không nằm hạ nguồn của model đã đổi nên
được bỏ qua.

Trên project 4 model thì tiết kiệm chẳng bao nhiêu. Trên project 400 model, sửa một
model staging thì `state:modified+` chạy vài chục thay vì bốn trăm — khác biệt giữa CI
2 phút và CI 40 phút.

Điều kiện: phải có `manifest.json` của **lần chạy trước** làm mốc. Thường lưu như một
artifact của CI, hoặc lấy từ lần deploy production gần nhất.

## `exposures` — khai ai đang đọc model của bạn

DAG của dbt dừng ở model cuối cùng. Nhưng thực tế còn có dashboard, API, notebook đang
đọc bảng đó — và dbt **không biết gì** về chúng.

```yaml
exposures:
  - name: dashboard_doanh_thu
    type: dashboard
    maturity: high
    url: https://bi.congty.vn/dashboards/12
    owner: {name: Nhóm BI, email: bi@congty.vn}
    depends_on:
      - ref('mart_doanh_thu_ngay')
```

Giá trị thật: `dbt ls --select +exposure:dashboard_doanh_thu` cho biết **mọi thứ mà
dashboard đó phụ thuộc vào**. Trước khi xoá một cột, câu lệnh đó trả lời được *"xoá cái
này thì gãy dashboard nào"* — thứ mà không có exposure thì chỉ biết sau khi có người
phàn nàn.

## Vì sao phần này quan trọng hơn vẻ ngoài

`dbt docs` nhìn giống "tài liệu cho đẹp". Thực ra ba thứ dưới đây là **công cụ vận hành**:

| Thứ | Trả lời câu hỏi |
|---|---|
| Lineage graph | "Sửa cột này thì gãy cái gì" |
| `state:modified` | "CI cần chạy lại những gì" |
| `exposures` | "Ai đang phụ thuộc vào bảng này ngoài dbt" |

Cả ba đều là câu hỏi **rà tác động**, và không có chúng thì câu trả lời là đoán.

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Không viết `description` | Không ai biết cột nghĩa là gì, kể cả bạn sáu tháng sau |
| Chỉ `dbt docs serve` cục bộ | Chỉ mình bạn xem được; phải deploy trang tĩnh |
| Không lưu `manifest.json` làm mốc | Không dùng được `state:modified`, CI chạy toàn bộ |
| Bỏ qua `exposures` | Xoá cột xong mới biết gãy dashboard |
| Copy cùng một mô tả vào nhiều model | Sửa một chỗ, các chỗ khác lệch; dùng `{% raw %}{% docs %}{% endraw %}` |

## Related Topics

- [Mục lục dbt](index.md)
- [Model và `ref()`](models-and-ref.md) — DAG đến từ đâu
- [Bài tập](../tutorials/dbt-lab-duckdb.md) bài 4
