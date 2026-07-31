---
title: Triển khai test trong dbt
sidebar_position: 1
description: "Sáu loại test dbt — khai ở đâu, viết thế nào, chạy ra gì: generic, package, singular, generic tự viết, unit test, contract."
tags: [dbt, test, data-quality, dbt-utils, unit-test, contract]
domain: data-engineering
category: technology
doc_type: skill
status: review
difficulty: intermediate
verified_at:
updated: 2026-07-31
---

# Triển khai test trong dbt

> **Chốt:** Mọi test dbt đều là một câu SQL **trả về các dòng SAI**. Trả 0 dòng = pass.
> Hiểu ngược điều này — viết câu "kiểm tra đúng" — là test luôn fail.

[Test và data quality](../reference/testing.md) giải thích *ba tầng và vì sao*. Trang này
là phần **làm**: khai ở đâu, cú pháp gì, chạy ra output nào.

Mọi output dưới đây chạy thật trên dbt 1.12.0 + dbt-duckdb 1.10.1 + dbt_utils 1.4.1.

## Sáu loại, chọn loại nào

| Loại | Khai ở đâu | Tái dùng | Dùng khi |
|---|---|---|---|
| Generic có sẵn | `schema.yml` | ✅ | 90% nhu cầu |
| Từ package | `schema.yml` + `packages.yml` | ✅ | test phổ biến mà dbt không có sẵn |
| Singular | file `.sql` trong `tests/` | ❌ một lần | luật nghiệp vụ riêng của một bảng |
| Generic tự viết | macro `{% raw %}{% test %}{% endraw %}` trong `macros/` | ✅ | luật lặp lại ở nhiều model |
| Unit test | `schema.yml`, mục `unit_tests` | — | kiểm **logic SQL**, không cần dữ liệu thật |
| Contract | `config: {contract: {enforced: true}}` | — | chặn schema sai **trước khi** tạo bảng |

Năm loại đầu chạy bằng `dbt test`. Contract chạy lúc `dbt run`.

## 1. Generic có sẵn — bốn cái

```yaml
# models/staging/schema.yml
version: 2

models:
  - name: stg_don_hang
    description: "Một dòng = một dòng hàng trong một đơn. Grain là cặp (don_hang_id, dong)."
    columns:
      - name: don_hang_id
        description: "Mã đơn hàng. KHÔNG unique — một đơn có nhiều dòng."
        data_tests: [not_null]
      - name: ma_hang
        data_tests:
          - not_null
          - relationships:
              to: ref('stg_hang_hoa')
              field: ma_hang
```

| Test | Bắt cái gì |
|---|---|
| `not_null` | Cột có `NULL` |
| `unique` | Giá trị lặp |
| `accepted_values` | Giá trị ngoài danh sách cho phép |
| `relationships` | Khoá ngoại trỏ tới thứ không tồn tại |

> **`data_tests` hay `tests`?** Từ dbt 1.8 trở đi tên đúng là `data_tests`. `tests` vẫn
> chạy nhưng đã deprecated.

Chạy:

```bash
dbt test --select stg_don_hang
```

```text
1 of 5 PASS dbt_utils_unique_combination_of_columns_stg_don_hang_don_hang_id__dong  [PASS in 0.03s]
2 of 5 PASS not_null_stg_don_hang_don_hang_id .................................. [PASS in 0.02s]
3 of 5 PASS not_null_stg_don_hang_ma_hang ...................................... [PASS in 0.02s]
4 of 5 PASS not_null_stg_don_hang_thanh_tien ................................... [PASS in 0.01s]
5 of 5 PASS relationships_stg_don_hang_ma_hang__ma_hang__ref_stg_hang_hoa_ ..... [PASS in 0.02s]
Done. PASS=5 WARN=0 ERROR=0 SKIP=0 TOTAL=5
```

### Test fail trông thế nào

Thêm `unique` vào `don_hang_id` — nghe rất hợp lý, nhưng **sai grain**:

```text
6 of 6 FAIL 4 unique_stg_don_hang_don_hang_id .................................. [FAIL 4 in 0.01s]
  Got 4 results, configured to fail if != 0
Done. PASS=5 WARN=0 ERROR=1 SKIP=0 TOTAL=6
```

**Dữ liệu đúng, test sai.** Grain là *cặp* `(don_hang_id, dong)`. Đây đúng ca đã gặp thật
— xem [case study](../reference/testing.md).

### Xem **dòng nào** sai

`FAIL 4` chỉ nói có 4 kết quả. Muốn biết là dòng nào:

```bash
dbt test --select stg_don_hang --store-failures
```

dbt ghi kết quả vào schema `<schema>_dbt_test__audit`:

```text
┌──────────────┬───────────┐
│ unique_field │ n_records │
├──────────────┼───────────┤
│ DH001        │         2 │
│ DH003        │         3 │
│ DH005        │         2 │
│ DH007        │         2 │
└──────────────┴───────────┘
```

Bốn đơn có nhiều dòng hàng — đúng như nghiệp vụ mô tả.

### Test thật ra là SQL gì

`target/compiled/.../unique_stg_don_hang_don_hang_id.sql`:

```sql
select
    don_hang_id as unique_field,
    count(*) as n_records
from "scratch"."main"."stg_don_hang"
where don_hang_id is not null
group by don_hang_id
having count(*) > 1
```

Đúng nguyên tắc: **trả về các dòng sai**. Đọc file này là hết bí ẩn về test nào bất kỳ.

## 2. Từ package — `dbt_utils`

```yaml
# packages.yml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]
```

```bash
dbt deps        # Installed from version 1.4.1
```

Khai ở **cấp model** (không thuộc cột nào) hoặc cấp cột:

```yaml
models:
  - name: stg_don_hang
    data_tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [don_hang_id, dong]   # test đúng cho grain tổ hợp
    columns:
      - name: thanh_tien
        data_tests:
          - dbt_utils.accepted_range: {min_value: 0, inclusive: false}
```

`unique_combination_of_columns` là test **cần ngay** cho mọi bảng có grain tổ hợp — thứ
mà `unique` một cột không làm được.

## 3. Singular test — luật riêng của một bảng

Một file `.sql` trong `tests/`. Không cần khai gì thêm, dbt tự nhặt.

```sql
-- tests/thanh_tien_khop_so_luong_don_gia.sql
-- Tra ve CAC DONG SAI. 0 dong = pass.
select don_hang_id, dong, so_luong, don_gia, thanh_tien,
       so_luong * don_gia as thanh_tien_dung
from {{ ref('stg_don_hang') }}
where thanh_tien <> so_luong * don_gia
```

```text
9 of 9 PASS thanh_tien_khop_so_luong_don_gia ................................... [PASS in 0.01s]
```

Dùng khi luật chỉ áp cho **một** bảng. Thấy mình copy file này sang bảng thứ hai là dấu
hiệu nên chuyển sang loại 4.

## 4. Generic tự viết — khi luật lặp lại

Một macro trong `macros/`, bọc bằng `{% raw %}{% test %}{% endraw %}`:

```sql
-- macros/test_khong_am.sql
{% raw %}{% test khong_am(model, column_name) %}
select {{ column_name }} as gia_tri_sai, count(*) as so_dong
from {{ model }}
where {{ column_name }} < 0
group by 1
{% endtest %}{% endraw %}
```

Hai tham số `model` và `column_name` dbt tự truyền vào. Dùng như test có sẵn:

```yaml
      - name: thanh_tien
        data_tests:
          - not_null
          - khong_am
```

```text
4 of 9 PASS khong_am_stg_don_hang_thanh_tien ................................... [PASS in 0.01s]
```

> dbt 1.12 phát cảnh báo `MissingArgumentsPropertyInGenericTestDeprecation` cho generic
> test tự viết chưa khai `arguments:`. Chạy vẫn được, nhưng nên bổ sung khi nâng cấp.

## 5. `severity` — cảnh báo thay vì chặn

Không phải lỗi nào cũng đáng dừng pipeline:

```yaml
      - name: so_luong
        data_tests:
          - dbt_utils.accepted_range:
              min_value: 1
              config: {severity: warn}      # canh bao, khong chan
```

| `severity` | Kết quả |
|---|---|
| `error` (mặc định) | `dbt test` exit khác 0 → CI đỏ, pipeline dừng |
| `warn` | Báo `WARN`, exit 0 → chạy tiếp |

Dùng `warn` cho luật "nên đúng" chưa chắc chắn, hoặc dữ liệu cũ chưa dọn xong. Còn có
`error_if`/`warn_if` theo ngưỡng số dòng, ví dụ `error_if: ">100"`.

## 6. Unit test — kiểm logic, không cần dữ liệu thật

Năm loại trên kiểm **dữ liệu**. Unit test kiểm **SQL**: cho input tự bịa, so với output
mong đợi.

```yaml
unit_tests:
  - name: test_thanh_tien_nhan_dung
    model: mart_doanh_thu_ngay
    given:
      - input: ref('stg_don_hang')
        rows:
          - {ngay: '2026-07-01', ma_hang: 'SP-A', thanh_tien: 300000}
          - {ngay: '2026-07-01', ma_hang: 'SP-A', thanh_tien: 200000}
      - input: ref('stg_hang_hoa')
        rows:
          - {ma_hang: 'SP-A', nhom: 'Điện tử'}
    expect:
      rows:
        - {ngay: '2026-07-01', nhom: 'Điện tử', doanh_thu: 500000, so_dong: 2}
```

```text
1 of 1 PASS mart_doanh_thu_ngay::test_thanh_tien_nhan_dung ..................... [PASS in 0.11s]
```

Giá trị lớn nhất: **chạy được khi chưa có dữ liệu**, và bắt được ca hiếm mà dữ liệu thật
tình cờ không có. Chỉ khai đúng các cột model dùng — không phải khai đủ schema.

## 7. Contract — chặn schema sai **trước khi** tạo bảng

Năm loại trên chạy **sau** khi bảng đã tạo. Contract chạy lúc `dbt run`:

```yaml
models:
  - name: mart_doanh_thu_ngay
    config:
      contract: {enforced: true}
    columns:
      - name: ngay
        data_type: date
      - name: nhom
        data_type: varchar
      - name: doanh_thu
        data_type: int128
      - name: so_dong
        data_type: bigint
```

Khớp thì chạy bình thường. Khai sai kiểu (`varchar` cho cột trả số):

```text
Compilation Error in model mart_doanh_thu_ngay
  This model has an enforced contract that failed.
  Please ensure the name, data_type, and number of columns in your contract
  match the columns in your model's definition.
  | column_name | definition_type | contract_type | mismatch_reason    |
  | doanh_thu   | HUGEINT         | VARCHAR       | data type mismatch |
```

**Bảng không được tạo.** Đây là khác biệt cốt lõi: test bắt lỗi *sau khi* dữ liệu sai đã
nằm trong warehouse; contract chặn *trước*.

Dùng cho bảng có người khác phụ thuộc vào — contract là lời hứa về schema, và dbt cưỡng
chế lời hứa đó.

## Thứ tự nên làm

Đừng viết test theo cảm hứng. Thứ tự cho một model mới:

1. **Chốt grain trước.** Sai bước này thì mọi test sau đều sai — ca `unique` ở trên.
2. `not_null` cho khoá và các cột dùng để join.
3. `unique` cho khoá **thật** — grain tổ hợp thì dùng `unique_combination_of_columns`.
4. `relationships` cho mọi khoá ngoại.
5. `accepted_values` cho cột phân loại.
6. Singular test cho luật nghiệp vụ đặc thù; lặp lại ở nhiều bảng thì nâng thành generic.
7. Contract cho bảng có người khác phụ thuộc.
8. Unit test cho logic phức tạp (window function, phân bổ, tính toán nhiều bước).

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Viết test theo kiểu "kiểm tra đúng" | Luôn fail — test phải trả **dòng sai** |
| `unique` một cột cho bảng grain tổ hợp | Fail dù dữ liệu đúng; phải dùng `unique_combination_of_columns` |
| Không dùng `--store-failures` khi debug | Chỉ biết "FAIL 4", không biết 4 dòng nào |
| Để mọi test `severity: error` | Pipeline dừng vì một luật chưa chắc chắn |
| Chỉ có test, không có contract | Bảng sai schema vẫn được tạo, người dùng hạ nguồn hứng |
| Unit test khai đủ mọi cột | Dài vô ích — chỉ cần cột model thật sự dùng |
| Viết test trước khi chốt grain | Test sai mà tưởng dữ liệu sai |

## Related Topics

- [Test và data quality](../reference/testing.md) — ba tầng và vì sao, kèm ca thật đã gặp
- [Model và `ref()`](../reference/models-and-ref.md) — `target/compiled/` là chỗ đọc SQL test
- [Materialization](../reference/materializations.md) — test là thứ bắt được `incremental` chạy sai
- [Grain](../../../data-modeling/reference/grain.md) — phải chốt trước khi viết test
- [Sáu chiều chất lượng](../../../data-quality/six-dimensions.md) — test phủ chiều nào, bỏ sót chiều nào
