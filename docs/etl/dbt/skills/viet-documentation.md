---
title: Viết documentation cho model
sidebar_position: 9
description: "description trong YAML không phải để cho đẹp — nó là chỗ duy nhất ghi grain, đơn vị và luật nghiệp vụ mà lineage không tự suy ra được."
tags: [dbt, documentation, schema-yml, docs-block, meta, dbt-docs]
domain: data-engineering
category: technology
doc_type: skill
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-11
---

# Viết documentation cho model

> **Chốt:** `dbt docs` tự sinh được **cấu trúc** (cột nào, kiểu gì, phụ thuộc ai) —
> nó không bao giờ tự sinh được **nghĩa** (một dòng là gì, số này đã trừ VAT chưa, vì
> sao lọc điều kiện đó). Viết doc là viết đúng phần máy không đoán được. Viết lại phần
> máy đã biết là lãng phí và sẽ lệch.

## Mục tiêu học

Viết được `schema.yml` mà sáu tháng sau người khác đọc là dùng được bảng đúng, sinh
được trang `dbt docs`, và biết đặt ngưỡng "doc tới đâu là đủ".

## Bước 1 — Ba câu bắt buộc cho mỗi model

Mọi model, không có ngoại lệ, phải trả lời được ba câu trong `description`:

1. **Grain** — một dòng của bảng này đại diện cho cái gì?
2. **Nguồn và phạm vi** — dữ liệu lấy từ đâu, đã lọc gì?
3. **Cảnh báo** — cái gì dễ dùng sai ở bảng này?

```yaml
# models/marts/schema.yml
version: 2

models:
  - name: mart_doanh_thu_ngay
    description: "Doanh thu và số đơn theo ngày đặt. Grain: một dòng một ngày."
    columns:
      - name: ngay
        description: "Ngày đặt đơn."
        tests: [unique, not_null]
      - name: doanh_thu
        description: "Tổng thành tiền của các dòng hàng trong ngày, chưa gồm phí ship."
        tests:
          - khong_am
```

Câu `chưa gồm phí ship` là ví dụ mẫu mực của thứ **chỉ con người viết được**. Không có
nó, người dùng tiếp theo sẽ cộng phí ship vào và tự hỏi vì sao lệch với báo cáo kế
toán.

## Bước 2 — Ngưỡng "doc tới đâu là đủ"

Bắt buộc doc mọi cột là cách chắc chắn khiến không ai doc gì cả. Ngưỡng thực dụng:

| Đối tượng | Mức bắt buộc |
|---|---|
| Model tầng marts | description + **mọi cột** |
| Model `stg_`/`int_` | description ở mức model; cột chỉ doc khi tên không tự giải thích |
| Cột khoá (`*_id`, `*_sk`) | luôn doc — nói rõ khoá của cái gì, tự nhiên hay thay thế |
| Cột số đo | luôn doc — **đơn vị, đã trừ gì, additivity** |
| Cột `ngay_*` | luôn doc — ngày nghiệp vụ hay ngày nạp, múi giờ nào |
| Cột hiển nhiên (`ten_hang`) | bỏ qua |

Ba loại cột giữa bảng là chỗ 90% lỗi hiểu nhầm xảy ra.

## Bước 3 — `docs` block: viết một lần, dùng nhiều chỗ

Mô tả dài hoặc lặp ở nhiều model thì tách ra:

```markdown
<!-- models/marts/docs.md -->
{% docs khach_id %}
Mã khách hàng từ hệ ERP (**natural key**, không phải surrogate key).

- Định dạng `C<số>`, ví dụ `C1`.
- **Không** duy nhất trong `snap_khach_hang` — ở đó một khách có nhiều phiên bản,
  khoá là `dbt_scd_id`.
{% enddocs %}
```

```yaml
columns:
  - name: khach_id
    description: "{{ doc('khach_id') }}"
```

Dùng khi cùng một cột xuất hiện ở ≥3 model — đúng ngưỡng của macro. Dưới mức đó, viết
thẳng còn dễ đọc hơn.

## Bước 4 — `meta`: thông tin máy đọc được

`description` cho người; `meta` cho máy.

```yaml
models:
  - name: mart_doanh_thu_ngay
    description: "Doanh thu và số đơn theo ngày đặt. Grain: một dòng một ngày."
    meta:
      owner: "data-team@cong-ty.vn"
      mat_do_cap_nhat: "hằng ngày 06:00 GMT+7"
      do_nhay_cam: "noi_bo"
      dashboard: "Doanh thu tổng quan"
    config:
      tags: ['hang_ngay', 'tai_chinh']
```

`meta` hiện trong `dbt docs` và nằm trong `manifest.json` — tức là **truy vấn được**.
Đó là cách trả lời "bảng nào không có chủ" mà không phải đọc tay:

```bash
dbt ls --output json --output-keys name meta | grep -v owner
```

`tags` thì khác `meta`: nó là **selector** dùng để chọn resource khi chạy.

```bash
dbt build --select tag:tai_chinh
dbt test  --select tag:hang_ngay
```

## Bước 5 — Sinh và đọc trang docs

```bash
dbt docs generate
```

```text
02:41:45  Concurrency: 4 threads (target='dev')
02:41:45  Building catalog
02:41:45  Catalog written to .../target/catalog.json
```

```bash
dbt docs serve --port 8080        # mở localhost:8080
```

Ba file sinh ra trong `target/`, mỗi file một vai trò:

| File | Là gì | Dùng để |
|---|---|---|
| `manifest.json` | **ý định** — mọi model/test/nguồn bạn đã khai | so sánh state cho CI, truy vấn metadata |
| `catalog.json` | **hiện thực** — cột và kiểu thật đang có trong warehouse | đối chiếu khai báo với thực tế |
| `index.html` | trang web tĩnh gộp hai file trên | đem host ở đâu cũng được |

Phân biệt `manifest` với `catalog` là chỗ hay nhầm. Khai trong YAML một cột không tồn
tại thật thì `manifest` có nó, `catalog` không — và trang docs hiện nó xám.

`dbt docs generate` **phải chạy sau khi `dbt run` thành công**, vì `catalog.json` đọc
metadata của bảng thật. Chạy trên môi trường trắng thì catalog rỗng.

## Bước 6 — Ép doc thành bắt buộc, không phải thiện chí

Doc không có thứ cưỡng chế thì sáu tháng sau trống. Hai cách, dùng cả hai:

**1. Contract** — khai cột là hợp đồng, sai kiểu là fail:

```yaml
models:
  - name: mart_doanh_thu_ngay
    config:
      contract: {enforced: true}
    columns:
      - name: ngay
        data_type: date
        constraints: [{type: not_null}]
      - name: doanh_thu
        data_type: bigint
```

**2. Kiểm trong CI** — model marts thiếu description thì chặn merge:

```bash
dbt ls --select path:models/marts --output json --output-keys name description \
  | grep '"description": ""' && echo 'THIEU DESCRIPTION' && exit 1
```

## Lỗi thường gặp

| Lỗi | Hậu quả |
|---|---|
| `description: "Bảng doanh thu"` | Không thêm thông tin nào so với tên bảng |
| Không ghi **grain** | Người sau join sai, tổng phồng — lỗi tốn kém nhất |
| Không ghi **đơn vị** của số đo | VND hay nghìn VND, đã trừ VAT chưa — lệch 10× |
| Mô tả cột lặp lại kiểu dữ liệu | `catalog.json` đã có; doc chỉ tạo chỗ lệch |
| `dbt docs generate` trước `dbt run` | catalog rỗng, cột hiện xám |
| Doc nói một đằng, model làm một nẻo | Tệ hơn không có doc — người đọc tin vào doc |
| Doc bảng `stg_` kỹ hơn bảng `marts` | Ngược ưu tiên; marts là thứ người ngoài đọc |
| Dùng `meta` thay `tags` để chọn resource | `meta` không phải selector |

## Kiểm chứng

```bash
dbt docs generate && dbt docs serve
dbt ls --output json --output-keys name description tags | head
python -c "import json;m=json.load(open('target/manifest.json'));print(len(m['nodes']))"
```

## Related Topics

- [dbt docs và lineage](../reference/docs-and-lineage.md) — phần lý thuyết, `state:modified`
- [Grain](../../../data-modeling/reference/grain.md) — câu quan trọng nhất phải viết vào description
- [Triển khai test trong dbt](implementing-tests.md) — contract là test ở tầng cấu trúc
- [CI/CD cho dbt project](ci-cd-cho-dbt.md) — ép doc thành bắt buộc
