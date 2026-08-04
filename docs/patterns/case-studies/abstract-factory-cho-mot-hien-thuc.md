---
title: Sáu kiểu để làm việc của hai kiểu
sidebar_position: 19
description: "Abstract Factory dựng cho một hiện thực duy nhất, chuẩn bị cho một tương lai không tới — bốn kiểu thừa, và mọi người mới mất một buổi để hiểu."
tags: [case-study, abstract-factory, over-engineering, yagni, strategy]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Sáu kiểu để làm việc của hai kiểu

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng
> `dotnet run cs-over-engineer.cs` trên .NET 11.0.0.

## Bối cảnh

Dự án mới cần lưu file và đẩy việc vào hàng đợi. Hạ tầng là Azure.

Trong buổi thiết kế, có người nêu: *"nhỡ sau này chuyển sang AWS thì sao?"* Đội đồng ý
dựng [Abstract Factory](../skills/abstract-factory.md) để "chuẩn bị trước".

```csharp
interface IKho { string Ghi(string ten); }
interface IHangDoi { string Day(string viec); }
interface IXuongLuuTru { IKho TaoKho(); IHangDoi TaoHangDoi(); }

sealed class KhoAzure : IKho { ... }
sealed class HangDoiAzure : IHangDoi { ... }
sealed class XuongLuuTruAzure : IXuongLuuTru { ... }
```

Ba năm trôi qua. Vẫn chỉ có Azure.

## Triệu chứng

Không có sự cố. Có năm chi phí, không cái nào xuất hiện trên báo cáo nào:

```text
=== Ban 'chuan bi cho tuong lai' ===
  so interface : 3   [IXuongLuuTru, IKho, IHangDoi]
  so lop cai   : 3   [XuongLuuTruAzure, KhoAzure, HangDoiAzure]
  so HO san pham thuc su ton tai: 1
  so lan nhay file de doc het luong: 6

=== Ban truc tiep ===
  so kieu: 2   so lan nhay file: 2

=== Ket qua giong nhau, chi phi khac nhau ===
  ket qua khop: True
  kieu thua   : 4
```

**Sáu kiểu để làm việc của hai.** Và:

| Chi phí | Quan sát được |
|---|---|
| Người mới đọc luồng lưu file | 6 lần nhảy file thay vì 2 |
| Câu hỏi "vì sao có xưởng?" trong onboarding | Mọi đợt tuyển, không ai trả lời được ngoài "để đổi cloud" |
| Thêm một loại sản phẩm (`IBoNhoDem`) | Sửa interface xưởng + lớp xưởng, dù chỉ có một hiện thực |
| Test | Mỗi test dựng xưởng giả trả về kho giả — hai tầng mock cho một lời gọi |
| Stack trace khi lỗi | Thêm hai khung không mang thông tin gì |

Chi phí thứ ba là chi phí đau nhất, và nó **ngược với lời hứa của pattern**: Abstract
Factory làm thêm *họ* rẻ và thêm *loại sản phẩm* đắt. Dự án này không bao giờ thêm họ, và
thêm loại sản phẩm sáu lần.

## Giả thuyết sai lúc đầu

Ở đây "giả thuyết sai" không phải về nguyên nhân sự cố, mà về **lý do giữ nguyên hiện
trạng**:

| Lập luận giữ nguyên | Vì sao nghe hợp lý | Vì sao không đứng vững |
|---|---|---|
| "Nhỡ mai chuyển AWS thì sao" | Rủi ro có thật | Ba năm không chuyển. Và nếu chuyển, abstraction hiện tại **gần như chắc chắn sai** — nó được thiết kế khi chưa ai biết AWS khác chỗ nào |
| "Bỏ đi thì mất khả năng test" | DI cần interface | Vẫn giữ `IKho`, `IHangDoi` được — thứ thừa là **lớp xưởng**, không phải interface sản phẩm |
| "Đã viết rồi, bỏ đi tốn công" | Sunk cost | Chi phí giữ lại là mọi lần đọc, mọi lần onboard, mọi lần thêm sản phẩm |
| "Nó không gây lỗi gì" | Đúng | Chi phí của over-engineering không bao giờ là lỗi. Nó là **tốc độ** |

Lập luận đầu là lập luận đáng phân tích nhất. Nó giả định rằng trừu tượng hoá **hôm nay**
sẽ vừa với nhu cầu **ngày mai**. Trừu tượng hoá từ **một** mẫu gần như luôn chọn sai trục:
bạn không biết AWS và Azure khác nhau ở đâu cho tới khi thật sự cài cả hai.

## Nguyên nhân thật

Pattern được chọn theo **rủi ro tưởng tượng**, không theo **đau đã có**.

Bốn dấu hiệu, tất cả đều có mặt ngay từ ngày đầu:

| Dấu hiệu | Ở dự án này |
|---|---|
| Interface có **đúng một** lớp cài | 3/3 |
| Không có kế hoạch cụ thể cho hiện thực thứ hai | Không có ticket, không có ngày |
| Tên lớp mang tên pattern trước khi có logic | `XuongLuuTru` được đặt tên trong buổi thiết kế |
| Phải giải thích mới hiểu nổi một luồng một nhánh | Mỗi lần onboard |

Xem thêm [khi nào đừng dùng pattern](../reference/what-is-a-pattern.md#khi-nào-không-nên-dùng-pattern).

Và điều đáng chú ý nhất: **lớp xưởng không mua thêm gì so với DI container.**

```csharp
services.AddSingleton<IKho, KhoAzure>();
services.AddSingleton<IHangDoi, HangDoiAzure>();
```

Hai dòng này đã đảm bảo cả bộ khớp nhau, vì cả bộ được đăng ký cùng một chỗ. Đổi sang AWS
là đổi hai dòng đó. Lớp xưởng là **một tầng nữa trên một tầng đã làm đúng việc đó**.

Abstract Factory chỉ thắng khi việc chọn họ xảy ra **lúc chạy, theo dữ liệu** — ví dụ chọn
bộ hạ tầng theo tenant của request. Ở dự án này, việc chọn xảy ra lúc khởi động.

## Vì sao không có gì bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Test | Xanh | Code đúng — nó chỉ thừa |
| Code review | Thông qua | Trông "chuyên nghiệp"; phản đối abstraction là điều khó nói trong review |
| Analyzer | Im lặng | Không có luật nào cấm interface một hiện thực |
| Chỉ số chất lượng code | Tốt | Coupling thấp, cohesion cao — mọi chỉ số đều đẹp |

Dòng cuối là bài học sâu nhất: **over-engineering làm mọi chỉ số chất lượng đẹp lên.**
Fan-out thấp hơn, mỗi lớp nhỏ hơn, độ phức tạp mỗi method thấp hơn. Không có thước đo tự
động nào phân biệt được "trừu tượng hoá đúng chỗ" với "trừu tượng hoá thừa".

Thứ duy nhất đo được là **thời gian**: bao lâu để một người mới hiểu luồng này, và bao lâu
để thêm một loại sản phẩm.

## Cách sửa

### Gỡ tầng thừa, giữ tầng có ích

```csharp
// Bo: IXuongLuuTru, XuongLuuTruAzure
// Giu: IKho, IHangDoi  (can cho test va cho DI)

services.AddSingleton<IKho, KhoAzure>();
services.AddSingleton<IHangDoi, HangDoiAzure>();
```

Bốn kiểu còn hai. Khả năng test giữ nguyên. Khả năng đổi nhà cung cấp giữ nguyên — thậm
chí **tốt hơn**, vì không phải đồng bộ hai tầng.

### Thang leo đúng thứ tự

Khi thật sự cần đổi hạ tầng, leo lên theo bậc:

| Bậc | Khi nào |
|---|---|
| 1. `new KhoAzure()` thẳng | Chưa cần test cô lập |
| 2. `IKho` + DI đăng ký | Cần test — **điểm dừng của phần lớn dự án** |
| 3. Hai module đăng ký (`AddAzure()`, `AddAws()`) | Đã có **hai** hiện thực thật |
| 4. Abstract Factory | Chọn họ **lúc chạy**, theo dữ liệu (multi-tenant) |

Dự án này nhảy thẳng từ bậc 1 lên bậc 4 dựa trên một câu hỏi trong buổi họp.

**Leo lên một bậc luôn dễ. Tụt xuống một bậc thì không** — vì cả đội đã quen với
abstraction, và gỡ nó ra bị coi là "làm code kém đi".

### Rule of Three

Viết thẳng lần đầu. Lần thứ hai gặp cùng vấn đề, copy và chịu đựng. Lần thứ ba mới trừu
tượng hoá — lúc đó đã có ba mẫu thật để biết trục biến thiên nằm ở đâu.

Chi tiết ở [Chọn pattern nào](../reference/choosing-a-pattern.md#khi-câu-trả-lời-đúng-là-không-pattern-nào)
và [Strategy](../skills/strategy.md#phần-không-phải-strategy-vẫn-còn-if-để-chọn) — nơi mô
tả biến thể phổ biến khác của cùng lỗi này.

## Dấu hiệu nhận ra sớm

```bash
# Interface chi co MOT lop cai
for i in $(grep -rhoP 'interface \K\w+' --include=*.cs src/); do
  n=$(grep -rc ": .*\b$i\b" --include=*.cs src/ | awk -F: '{s+=$2} END {print s}')
  [ "$n" = "1" ] && echo "$i — 1 lop cai"
done
```

Ba câu hỏi, hỏi **trước khi** viết abstraction:

1. Hiện thực thứ hai tên là gì? Nếu không đặt tên được thì nó chưa tồn tại.
2. Nó nằm trong kế hoạch quý nào? Không có ngày = không có nhu cầu.
3. DI container đã làm việc này chưa? Với phần lớn ca chọn hạ tầng, câu trả lời là **rồi**.

Câu thứ nhất là câu hiệu quả nhất trong buổi thiết kế: nó biến *"nhỡ sau này…"* thành một
mệnh đề kiểm được.

## Related Topics

- [Design pattern là gì](../reference/what-is-a-pattern.md) — khi nào đừng dùng, và Rule of Three
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — thang leo và điểm dừng
- [Abstract Factory](../skills/abstract-factory.md) — khi nào nó thật sự đúng
- [Strategy](../skills/strategy.md) — biến thể phổ biến khác của cùng lỗi
- [Case study — Design Patterns](index.md)
