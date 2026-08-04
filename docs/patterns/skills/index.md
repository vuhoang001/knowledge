---
title: Kỹ năng — 23 pattern GoF
sidebar_position: 0
description: "Hai mươi ba pattern Gang of Four, mỗi cái kèm một ca hỏng chạy được bằng C# và mục khi nào đừng dùng."
tags: [skill, design-pattern, gof]
domain: backend
category: index
doc_type: index
updated: 2026-08-04
---

# Kỹ năng — 23 pattern GoF

Mỗi trang trả lời *"gặp tình huống X thì xử lý ra sao"*, và giả định phần
[Tài liệu](../reference/index.md) đã nắm. Mọi ví dụ chạy được bằng
`dotnet run <file>.cs` trên .NET 11.0.0.

**Mỗi trang đều có mục *Khi nào KHÔNG dùng*.** Đó là mục đáng đọc trước tiên — phần lớn
thiệt hại từ design pattern đến từ việc dùng đúng công thức ở sai chỗ.

## Creational — đối tượng được **tạo ra** thế nào

| # | Pattern | Giải bài toán gì | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Singleton](singleton.md) | Đúng một thể hiện — và vì sao gần như luôn nên dùng DI thay thế | beginner | 📝 lý thuyết |
| 2 | [Factory Method](factory-method.md) | `switch` để `new` lan ra nhiều chỗ rồi lệch nhau | beginner | 📝 lý thuyết |
| 3 | [Abstract Factory](abstract-factory.md) | Một họ sản phẩm phải khớp nhau; trộn họ không báo lỗi | intermediate | 📝 lý thuyết |
| 4 | [Builder](builder.md) | Constructor nhiều tham số cùng kiểu, hoán vị nhầm vẫn biên dịch | beginner | 📝 lý thuyết |
| 5 | [Prototype](prototype.md) | Nhân bản object — và bẫy sao chép nông của cả `record with` | intermediate | 📝 lý thuyết |

## Structural — chúng **ghép lại** với nhau ra sao

| # | Pattern | Giải bài toán gì | Mức | Trạng thái |
|---|---|---|---|---|
| 6 | [Adapter](adapter.md) | API bên thứ ba không khớp — và bẫy adapter nuốt lỗi | beginner | 📝 lý thuyết |
| 7 | [Bridge](bridge.md) | Hai trục biến thiên: `n × m` lớp thành `n + m` | advanced | 📝 lý thuyết |
| 8 | [Composite](composite.md) | Xử lý một cái và một nhóm cái như nhau; và chu trình trong cây | intermediate | 📝 lý thuyết |
| 9 | [Decorator](decorator.md) | Thêm hành vi không sửa lớp gốc — thứ tự bọc đổi ngữ nghĩa | intermediate | 📝 lý thuyết |
| 10 | [Facade](facade.md) | Một cửa vào cho hệ con nhiều bước; và bẫy phình thành god object | beginner | 📝 lý thuyết |
| 11 | [Flyweight](flyweight.md) | Hàng trăm nghìn object gần giống nhau ăn hết RAM | advanced | 📝 lý thuyết |
| 12 | [Proxy](proxy.md) | Chen vào trước khi chạm object thật; lazy proxy và N+1 | intermediate | 📝 lý thuyết |

## Behavioral — chúng **nói chuyện** với nhau thế nào

| # | Pattern | Giải bài toán gì | Mức | Trạng thái |
|---|---|---|---|---|
| 13 | [Chain of Responsibility](chain-of-responsibility.md) | Chuỗi người xử lý; và yêu cầu rơi qua hết chuỗi im lặng | intermediate | 📝 lý thuyết |
| 14 | [Command](command.md) | Vật hoá yêu cầu để undo, xếp hàng, chạy lại | intermediate | 📝 lý thuyết |
| 15 | [Interpreter](interpreter.md) | Một ngôn ngữ nhỏ cấu hình được; một cây, nhiều đầu ra | advanced | 📝 lý thuyết |
| 16 | [Iterator](iterator.md) | Duyệt không lộ cấu trúc; sửa khi đang duyệt, và lazy tính lại | beginner | 📝 lý thuyết |
| 17 | [Mediator](mediator.md) | `n(n-1)/2` liên kết thành `n` — và trung gian phình | intermediate | 📝 lý thuyết |
| 18 | [Memento](memento.md) | Chụp trạng thái để undo, không phá đóng gói | intermediate | 📝 lý thuyết |
| 19 | [Observer](observer.md) | Một chỗ đổi nhiều chỗ biết; rò rỉ bộ nhớ khi quên huỷ đăng ký | intermediate | 📝 lý thuyết |
| 20 | [State](state.md) | Luật chuyển trạng thái có chỗ để cưỡng chế | intermediate | 📝 lý thuyết |
| 21 | [Strategy](strategy.md) | Chọn thuật toán bằng dữ liệu, không bằng `if` | beginner | 📝 lý thuyết |
| 22 | [Template Method](template-method.md) | Khung cố định, vài bước biến thiên; và bẫy quên gọi `base` | intermediate | 📝 lý thuyết |
| 23 | [Visitor](visitor.md) | Thêm thao tác lên cây kiểu cố định, không sửa lớp nút | advanced | 📝 lý thuyết |

## Sáu pattern đọc trước nếu chỉ có thời gian cho sáu

[Strategy](strategy.md) · [Adapter](adapter.md) · [Decorator](decorator.md) ·
[Observer](observer.md) · [Factory Method](factory-method.md) · [Composite](composite.md)

Sáu cái này chiếm phần lớn số lần bạn thật sự gặp pattern trong code .NET hằng ngày, và
năm trong sáu đã nằm sẵn trong BCL (`Stream` là Decorator, `event` là Observer,
`IEnumerable` là Iterator).

## Ba pattern đọc để **biết mà tránh**

| Pattern | Vì sao |
|---|---|
| [Singleton](singleton.md) | Gần như luôn nên thay bằng vòng đời singleton của DI container |
| [Interpreter](interpreter.md) | Hiếm khi đúng chỗ; `Expression<T>` thường là câu trả lời |
| [Visitor](visitor.md) | Đắt khi tập kiểu còn thay đổi; `switch` biểu thức đủ cho phần lớn ca |

## Related Topics

- [Design Patterns](../index.md) — chủ đề chứa thư mục này
- [Tài liệu](../reference/index.md) — nền tảng, đọc trước
- [Chọn pattern nào](../reference/choosing-a-pattern.md) — tra ngược từ triệu chứng
- [Cheatsheet 23 GoF](../cheatsheets/gof-23.md) — bảng một trang
- [Case study](../case-studies/index.md) — mỗi pattern một ca hỏng cụ thể
