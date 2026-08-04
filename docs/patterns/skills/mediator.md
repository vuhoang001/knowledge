---
title: Mediator
sidebar_position: 17
description: "n thành phần biết nhau là n(n-1)/2 liên kết; qua trung gian còn n — 20 ô giao diện là 190 xuống 20, đổi lại một god object tiềm tàng."
tags: [mediator, behavioral, gof, coupling, cqrs]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Mediator

> **Chốt:** Mediator đổi mạng nhện `n(n-1)/2` liên kết thành `n` — nhưng **không xoá độ
> phức tạp, chỉ dồn nó về một chỗ**. Chỗ đó là trung gian, và nó sẽ phình. Cả giá trị lẫn
> rủi ro của pattern này nằm trong một câu đó.

## Mục tiêu

Chặn tình trạng mỗi thành phần phải giữ tham chiếu tới mọi thành phần khác — kiểu code mà
sửa một chỗ phải mở năm file, và không ai vẽ được sơ đồ.

## Ý định gốc (GoF)

Định nghĩa một đối tượng đóng gói cách một tập hợp đối tượng tương tác. Mediator giảm
coupling bằng cách ngăn các đối tượng tham chiếu thẳng tới nhau.

## Ví dụ xuyên suốt — form đơn hàng

Chạy bằng `dotnet run 22-mediator.cs` trên .NET 11.0.0. Bốn ô: `so_luong`, `don_gia`,
`thanh_tien`, `thue`. Đổi ô này phải cập nhật ô kia.

### Trước — các ô tự gọi nhau

```text
=== Truoc: cac o giao dien tu goi nhau ===
  4 o -> 12 tham chieu (moi lien ket dem 2 lan)
```

```text
so o (n)       tu goi nhau: n(n-1)/2   qua trung gian: n
--------------------------------------------------------
4                                  6                   4
6                                 15                   6
10                                45                  10
20                               190                  20
```

**Đây là hàm bậc hai so với hàm tuyến tính.** Ở 4 ô thì 6 và 4 gần nhau; ở 20 ô thì 190
so với 20 — và 190 liên kết nghĩa là không ai còn nắm được cái gì ảnh hưởng cái gì.

### Sau — mỗi ô chỉ biết trung gian

```csharp
sealed class FormDonHang : ITrungGian
{
    public void ThongBao(string tenO, string giaTri)
    {
        if (tenO is "so_luong" or "don_gia")
        {
            var tt = decimal.Parse(_o["so_luong"]) * decimal.Parse(_o["don_gia"]);
            _o["thanh_tien"] = tt.ToString("N0");
            _o["thue"] = (tt * 0.1m).ToString("N0");
        }
    }
}
```

```text
=== Sau: moi o chi biet trung gian ===
  dat so_luong=3  -> thanh_tien=0  thue=0
  dat don_gia=150000 -> thanh_tien=450,000  thue=45,000
  dat so_luong=5  -> thanh_tien=750,000  thue=75,000
```

```text
=== Fan-out do bang reflection ===
  ONhap    : biet 1 thu (chi trung gian)
  FormDonHang: biet 1 field
  -> do phuc tap don ve MOT cho: chinh trung gian. Do la ca duoc lan mat.
```

**Toàn bộ luật liên động nằm trong một method.** Muốn biết "đổi đơn giá thì cái gì cập
nhật", đọc đúng một chỗ — thay vì lần theo sáu tham chiếu chéo.

### Trước và sau

| | Các ô tự gọi nhau | Mediator |
|---|---|---|
| Số liên kết với 20 ô | 190 | 20 |
| Fan-out mỗi ô | tới 19 | 1 |
| Thêm luật "giảm giá theo số lượng" | sửa 2–3 ô | sửa 1 method |
| Tái dùng một ô ở form khác | không — nó biết các ô cụ thể | có |
| Đọc luật liên động | rải khắp nơi | một chỗ |
| Kích thước lớp trung gian | — | **phình theo số luật** |

Dòng cuối là cái giá, và là chỗ pattern này hay hỏng. Ca hỏng:
[Facade phình thành god object](../case-studies/facade-phinh-thanh-god-object.md) — cùng
cơ chế, và Mediator dễ mắc hơn vì nó *phải* biết tất cả theo thiết kế.

## Giữ trung gian không phình

| Kỹ thuật | Cách làm |
|---|---|
| **Một trung gian cho một nhóm gắn kết** | `FormDonHang` và `FormThanhToan` là hai trung gian, không phải một `FormManager` |
| **Trung gian chỉ điều phối, không chứa logic nghiệp vụ** | Tính thuế nằm trong `MayTinhThue`; trung gian chỉ gọi và phân phối kết quả |
| **Đăng ký theo loại thông điệp** | `Dictionary<Type, Handler>` thay cho một `switch` dài — chính là kiểu MediatR |
| **Đo bằng số nhánh** | Trên ~7 nhánh trong `ThongBao` là dấu hiệu cần tách |

Kỹ thuật thứ ba là bước chuyển từ Mediator GoF sang Mediator kiểu CQRS, và nó đổi hẳn bản
chất pattern — xem mục dưới.

## Hai loại Mediator hay bị gộp làm một

| | Mediator GoF | Mediator kiểu MediatR / CQRS |
|---|---|---|
| Các bên | Biết nhau qua trung gian, trung gian biết hết | Người gửi không biết ai xử lý, mỗi thông điệp một handler |
| Trung gian chứa gì | Luật liên động | **Không gì cả** — chỉ định tuyến |
| Có phình không | Có, theo số luật | Không — luật nằm trong handler |
| Vấn đề nó giải | Mạng nhện n×n | Tách người gửi khỏi người xử lý |

**Đây là hai pattern khác nhau đội cùng một tên.** MediatR không giải bài toán n×n của
GoF; nó là một dispatcher. Dùng nó rồi tưởng đã hạ coupling giữa các thành phần là hiểu
nhầm phổ biến — nó chỉ chuyển lời gọi trực tiếp thành lời gọi gián tiếp qua kiểu thông
điệp.

## Khi nào KHÔNG dùng

| Tình huống | Vì sao |
|---|---|
| Ít hơn ~4 thành phần | 3 thành phần là 3 liên kết; trung gian thêm một lớp không mua gì |
| Quan hệ một chiều, một–nhiều | [Observer](observer.md) đơn giản hơn |
| Các thành phần không thật sự liên động | Ép qua trung gian tạo phụ thuộc giả |
| Luật liên động rất nhiều và phức tạp | Trung gian thành god object; cân nhắc máy trạng thái hoặc rules engine |

## Trade-offs

| Được | Mất |
|---|---|
| `n` liên kết thay vì `n(n-1)/2` | Trung gian biết tất cả — fan-out cao theo thiết kế |
| Luật liên động ở một chỗ, đọc được | Trung gian phình theo số luật |
| Thành phần tái dùng được ở ngữ cảnh khác | Thêm một tầng gián tiếp khi lần luồng |
| Thay đổi luật không đụng thành phần | Trung gian thành nút thắt: mọi thay đổi đi qua nó |

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Một trung gian cho toàn ứng dụng | God object; fan-out 20+, mọi thay đổi đụng vào |
| Nhét logic nghiệp vụ vào trung gian | Luật nghiệp vụ nằm ở tầng điều phối, không ai tìm ở đó |
| Thành phần vẫn giữ tham chiếu chéo "cho tiện" | Có cả hai đường; mạng nhện quay lại nhưng khó thấy hơn |
| Trung gian gọi lại thành phần đã gửi thông báo | Vòng lặp thông báo vô hạn |
| Dùng MediatR rồi tưởng đã hạ coupling n×n | Đó là dispatcher, không phải Mediator GoF |
| Trung gian giữ trạng thái chung của mọi thành phần | Nó trở thành nơi chứa trạng thái toàn cục |

Dòng thứ tư có cách chặn cụ thể: thêm cờ `_dangXuLy` hoặc truyền nguồn gửi vào và bỏ qua
nó khi phân phối lại.

## FAQ

<details>
<summary>Mediator khác Observer chỗ nào?</summary>

Hướng và hiểu biết. [Observer](observer.md) là **một–nhiều một chiều**: nguồn phát tín
hiệu và **không biết** ai nghe. Mediator là **nhiều–nhiều hai chiều**: trung gian biết
tất cả và chủ động điều phối ai làm gì.

Phép thử: nếu bạn cần "khi A đổi thì B và C tính lại, nhưng nếu B đang khoá thì C không
tính" — đó là luật, cần Mediator. Nếu chỉ là "ai quan tâm thì nghe" — Observer.

</details>

<details>
<summary>Mediator khác Facade chỗ nào?</summary>

Chiều gọi. [Facade](facade.md) là một chiều: người gọi → facade → hệ con, và hệ con
**không biết** facade tồn tại. Mediator hai chiều: các thành phần chủ động báo cho trung
gian, và trung gian gọi ngược lại chúng.

Hệ quả: bỏ facade đi thì hệ con vẫn chạy được; bỏ mediator đi thì các thành phần mất liên
lạc hoàn toàn.

</details>

<details>
<summary>Trung gian có nên là interface không?</summary>

Có, và đó là điểm quan trọng: thành phần phụ thuộc `ITrungGian`, không phụ thuộc
`FormDonHang`. Nhờ đó cùng một ô nhập dùng được ở nhiều form, và test được với trung gian
giả.

Nếu thành phần biết kiểu cụ thể của trung gian, bạn chỉ vừa đổi mạng nhện `n×n` thành
mạng nhện `n×1` với cùng độ chặt.

</details>

## Related Topics

- [Observer](observer.md) — một chiều, nguồn không biết ai nghe
- [Facade](facade.md) — một chiều, hệ con không biết facade
- [Coupling và cohesion](../reference/coupling-cohesion.md) — fan-out và ngưỡng god object
- [Chain of Responsibility](chain-of-responsibility.md) — chuyển tiếp thay vì điều phối
- [Command](command.md) — thông điệp gửi qua mediator thường là command

## References

- GoF — *Design Patterns*, Mediator
