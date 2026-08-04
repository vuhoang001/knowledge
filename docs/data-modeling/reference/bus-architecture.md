---
title: Bus architecture, bus matrix và value chain
sidebar_position: 7
description: "Kho dữ liệu doanh nghiệp dựng từng quy trình một mà không thành mảnh vụn — bus matrix là bản kế hoạch, và nó nên là dữ liệu chứ không phải slide."
tags: [bus-matrix, bus-architecture, value-chain, conformed-dimension, kimball, data-modeling]
domain: data-engineering
category: concept
doc_type: reference
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Bus architecture, bus matrix và value chain

> **Chốt:** không ai dựng được cả kho dữ liệu doanh nghiệp trong một lần. Bus
> architecture là câu trả lời của Kimball cho việc **dựng từng quy trình một mà cuối cùng
> vẫn ghép lại được**: mỗi lần làm một fact, nhưng dùng chung một bộ dimension đã thống
> nhất.

## Vì sao có khái niệm này

Hai cách tiếp cận sai đối xứng nhau:

| Cách làm | Kết quả |
|---|---|
| Dựng cả kho một lượt, thiết kế xong hết rồi mới làm | Hai năm sau chưa ai dùng được gì; yêu cầu đã đổi |
| Mỗi phòng ban tự dựng mart của mình | Chạy nhanh, và không mart nào ghép được với mart nào |

Bus architecture đi giữa: **giao từng mảnh nhỏ dùng được ngay**, nhưng mọi mảnh cắm vào
cùng một "bus" — tập [conformed dimension](../skills/conformed-dimension.md) dùng chung.
Ẩn dụ là bus dữ liệu trong máy tính: card mới cắm vào là chạy, vì chuẩn giao tiếp đã
thống nhất từ trước.

Điều kiện đổi lại: **dimension phải được thiết kế trước fact**, và phải thiết kế cho toàn
doanh nghiệp chứ không cho một phòng ban.

## Bus matrix — nên là một bảng dữ liệu

Bus matrix thường sống dưới dạng slide rồi bị quên. Để nó dùng được, hãy để nó là **một
bảng trong kho**: hàng là quy trình nghiệp vụ, cột là dimension.

```sql
CREATE TABLE bus_matrix AS
SELECT * FROM (VALUES
  ('Mua hang','Ngay',true), ('Mua hang','Nha cung cap',true),
  ('Mua hang','San pham',true), ('Mua hang','Khach hang',false), ('Mua hang','Kho',true),
  ('Nhap kho','Ngay',true), ('Nhap kho','Nha cung cap',true),
  ('Nhap kho','San pham',true), ('Nhap kho','Khach hang',false), ('Nhap kho','Kho',true),
  ('Ton kho','Ngay',true),  ('Ton kho','Nha cung cap',false),
  ('Ton kho','San pham',true), ('Ton kho','Khach hang',false), ('Ton kho','Kho',true),
  ('Ban hang','Ngay',true), ('Ban hang','Nha cung cap',false),
  ('Ban hang','San pham',true), ('Ban hang','Khach hang',true), ('Ban hang','Kho',true),
  ('Tra hang','Ngay',true), ('Tra hang','Nha cung cap',false),
  ('Tra hang','San pham',true), ('Tra hang','Khach hang',true), ('Tra hang','Kho',false)
) t(quy_trinh, dimension, co_dung);
```

```sql
PIVOT bus_matrix ON dimension USING bool_or(co_dung) GROUP BY quy_trinh;
```

```text
┌───────────┬────────────┬─────────┬─────────┬──────────────┬──────────┐
│ quy_trinh │ Khach hang │   Kho   │  Ngay   │ Nha cung cap │ San pham │
├───────────┼────────────┼─────────┼─────────┼──────────────┼──────────┤
│ Mua hang  │ false      │ true    │ true    │ true         │ true     │
│ Nhap kho  │ false      │ true    │ true    │ true         │ true     │
│ Tra hang  │ true       │ false   │ true    │ false        │ true     │
│ Ton kho   │ false      │ true    │ true    │ false        │ true     │
│ Ban hang  │ true       │ true    │ true    │ false        │ true     │
└───────────┴────────────┴─────────┴─────────┴──────────────┴──────────┘
```

Mỗi hàng là **một fact table dự kiến**; mỗi ô `true` là một khoá ngoại. Nhìn bảng này là
thấy ngay phạm vi của cả kho.

### Ba câu hỏi bảng này trả lời ngay

**1. Dimension nào phải conform trước?** Cái nào gắn nhiều quy trình nhất:

```sql
SELECT dimension, count(*) FILTER (WHERE co_dung) AS so_quy_trinh_dung
FROM bus_matrix GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌──────────────┬───────────────────┐
│  dimension   │ so_quy_trinh_dung │
├──────────────┼───────────────────┤
│ Ngay         │                 5 │
│ San pham     │                 5 │
│ Kho          │                 4 │
│ Khach hang   │                 2 │
│ Nha cung cap │                 2 │
└──────────────┴───────────────────┘
```

`Ngay` và `San pham` gắn cả 5 quy trình — làm hỏng hai cái này là hỏng toàn bộ kho. Đó là
thứ tự ưu tiên công sức, và nó có căn cứ chứ không theo cảm tính.

**2. Kho đang liên kết chặt tới đâu?**

```sql
SELECT count(*) FILTER (WHERE co_dung) AS o_can_conform,
       count(*)                        AS o_toi_da,
       round(100.0 * count(*) FILTER (WHERE co_dung) / count(*), 1) AS mat_do_pct
FROM bus_matrix;
```

```text
┌───────────────┬──────────┬────────────┐
│ o_can_conform │ o_toi_da │ mat_do_pct │
├───────────────┼──────────┼────────────┤
│            18 │       25 │       72.0 │
└───────────────┴──────────┴────────────┘
```

**72%** — một chỉ số theo dõi được theo thời gian. Mật độ tăng nghĩa là kho ngày càng
liên kết; nhiều fact dùng chung nhiều dimension.

**3. Câu hỏi nào là bất khả thi?** Ô `false` cho biết luôn: không thể hỏi *"tồn kho theo
khách hàng"*, vì tồn kho không có chiều khách hàng. Biết trước điều này rẻ hơn nhiều so
với phát hiện sau ba tháng — xem [case study hai mart không ghép được](../case-studies/hai-mart-khong-ghep-duoc.md).

## Value chain — vì sao thứ tự các hàng có ý nghĩa

Các quy trình trong bus matrix không rời rạc; chúng nối thành **chuỗi giá trị**:

```text
Mua hang → Nhap kho → Ton kho → Ban hang → Tra hang
```

Mỗi bước là một fact riêng, grain riêng, nhịp dữ liệu riêng. Nhưng vì dùng chung
`dim_san_pham`, chúng **drill-across** được dọc chuỗi:

```sql
SELECT coalesce(m.san_pham, b.san_pham)     AS san_pham,
       m.so_luong                           AS mua,
       n.so_luong                           AS nhap_kho,
       t.so_luong                           AS con_ton,
       b.so_luong                           AS da_ban,
       coalesce(r.so_luong, 0)              AS bi_tra,
       m.so_luong - n.so_luong              AS hao_hut_van_chuyen,
       n.so_luong - t.so_luong - b.so_luong AS chua_giai_thich_duoc
FROM fct_mua m
FULL JOIN fct_nhap n USING (san_pham)
FULL JOIN fct_ton  t USING (san_pham)
FULL JOIN fct_ban  b USING (san_pham)
FULL JOIN fct_tra  r USING (san_pham)
ORDER BY 1;
```

```text
┌──────────┬───────┬──────────┬─────────┬────────┬────────┬────────────────────┬──────────────────────┐
│ san_pham │  mua  │ nhap_kho │ con_ton │ da_ban │ bi_tra │ hao_hut_van_chuyen │ chua_giai_thich_duoc │
├──────────┼───────┼──────────┼─────────┼────────┼────────┼────────────────────┼──────────────────────┤
│ SP-A     │   100 │       98 │      30 │     68 │      4 │                  2 │                    0 │
│ SP-B     │    50 │       50 │      12 │     38 │      0 │                  0 │                    0 │
└──────────┴───────┴──────────┴─────────┴────────┴────────┴────────────────────┴──────────────────────┘
```

Hai cột cuối là lý do tồn tại của cả kiến trúc này. `hao_hut_van_chuyen = 2` cho `SP-A` —
mua 100, nhập kho 98 — là câu hỏi **không quy trình đơn lẻ nào trả lời được**. Nó chỉ
xuất hiện khi đặt hai fact cạnh nhau qua một dimension chung.

`chua_giai_thich_duoc = 0` là bất biến đáng đặt thành test: nhập kho phải bằng tồn cộng
bán. Khác 0 nghĩa là có thất thoát, hoặc có fact chưa nạp đủ.

Và biên tệ — chỉ tính được khi hai đầu chuỗi conform:

```text
┌──────────┬──────────┬───────────────┬───────┬──────────┐
│ san_pham │ tien_mua │ doanh_thu_ban │ chenh │ bien_pct │
├──────────┼──────────┼───────────────┼───────┼──────────┤
│ SP-B     │    40000 │         76000 │ 36000 │     90.0 │
│ SP-A     │    60000 │        108000 │ 48000 │     80.0 │
└──────────┴──────────┴───────────────┴───────┴──────────┘
```

**Lưu ý:** đây là drill-across — gộp từng fact về cùng grain **trước**, rồi mới ghép.
Join thẳng hai fact khác grain là ca hỏng ở
[join hai fact làm phồng tổng](../case-studies/join-hai-fact-lam-phong-tong.md).

## Opportunity/stakeholder matrix — làm cái nào trước

Bus matrix nói *cái gì ghép được với cái gì*. Opportunity matrix nói *nên làm cái nào
trước*: hàng vẫn là quy trình, cột là **phòng ban**.

```sql
SELECT quy_trinh, count(*) FILTER (WHERE quan_tam) AS so_phong_ban_quan_tam,
       list(phong_ban) FILTER (WHERE quan_tam)     AS ai_dung
FROM opportunity GROUP BY 1 ORDER BY 2 DESC;
```

```text
┌───────────┬───────────────────────┬───────────────────────────────────────┐
│ quy_trinh │ so_phong_ban_quan_tam │                ai_dung                │
├───────────┼───────────────────────┼───────────────────────────────────────┤
│ Tra hang  │                     3 │ [Kinh doanh, Marketing, Van hanh kho] │
│ Ban hang  │                     3 │ [Kinh doanh, Tai chinh, Marketing]    │
│ Ton kho   │                     2 │ [Tai chinh, Van hanh kho]             │
└───────────┴───────────────────────┴───────────────────────────────────────┘
```

Hai bảng dùng cùng nhau: bus matrix cho biết **chi phí kỹ thuật** (bao nhiêu dimension
phải conform), opportunity matrix cho biết **giá trị** (bao nhiêu phòng ban dùng). Làm
trước cái nhiều người dùng và ít dimension mới.

## Graceful extension — mô hình chiều mở rộng được tới đâu

Kimball xếp *graceful extensions* vào nhóm khái niệm nền vì nó là lý do bus architecture
hoạt động: bốn thay đổi sau **không phá** báo cáo đang chạy:

| Thay đổi | Vì sao không phá |
|---|---|
| Thêm **thuộc tính** vào dimension | Query cũ không chọn cột đó |
| Thêm **số đo** vào fact (cùng grain) | `SELECT` cũ không đụng tới |
| Thêm **dimension** vào fact (cùng grain) | Dòng cũ trỏ vào dòng "không áp dụng" |
| Thêm **fact mới** dùng dimension sẵn có | Không đụng gì tới fact cũ |

Cái **phá**, và không có cách nào tránh: **đổi grain của fact đang có**. Đây là lý do
[grain](grain.md) là quyết định đắt nhất trong cả mô hình — mọi thứ khác đều sửa được
dần.

Hệ quả thực tế: khi phân vân giữa grain mịn và grain thô, **luôn chọn mịn hơn**. Gộp lên
thì lúc nào cũng làm được; tách nhỏ ra thì phải dựng lại từ đầu.

## Trade-offs

| Được | Mất |
|---|---|
| Giao từng mảnh dùng được ngay | Phải thống nhất dimension **trước**, việc của tổ chức |
| Mọi mart ghép được về sau | Dự án đầu tiên tốn thêm thời gian dựng conformed dimension |
| Bus matrix là bảng → đo được, tra được | Phải cập nhật khi kho đổi |
| Mở rộng không phá cái cũ | Trừ khi đổi grain — không có đường lùi |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Mỗi phòng ban tự dựng `dim_khach` riêng | Không mart nào ghép được — [case study](../case-studies/moi-mart-mot-dim-khach.md) |
| Bus matrix làm một lần rồi để trong slide | Sáu tháng sau không khớp thực tế |
| Dựng fact trước, conform dimension sau | Phải sửa lại toàn bộ khoá ngoại đã nạp |
| Chọn quy trình đầu tiên theo "ai đòi to nhất" | Có thể là quy trình ít người dùng nhất |
| Join thẳng hai fact trong chuỗi giá trị | Phồng tổng — phải drill-across |
| Chọn grain thô "cho gọn" | Không mở rộng được, phải dựng lại |

## Related Topics

- [Conformed dimension](../skills/conformed-dimension.md) — thứ mà "bus" thật sự là
- [Conformed facts](../skills/conformed-facts.md) — ghép được rồi còn phải so được
- [Quy trình thiết kế 4 bước](design-process.md) — bus matrix là đầu ra của bước 1
- [Grain](grain.md) — thứ duy nhất không mở rộng mềm được
- [CS: mỗi mart một dim_khach](../case-studies/moi-mart-mot-dim-khach.md)
- [CS: hai mart không ghép được](../case-studies/hai-mart-khong-ghep-duoc.md)

## References

- Kimball Group — [Enterprise Data Warehouse Bus Architecture · Bus Matrix · Value Chain · Opportunity/Stakeholder Matrix · Graceful Extensions](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
- Kimball & Ross, *The Data Warehouse Toolkit* (3rd ed.), chương 4 và 16
