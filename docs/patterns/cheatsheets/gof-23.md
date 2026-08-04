---
title: 23 pattern GoF — tra nhanh
sidebar_position: 1
description: "Bảng một trang: ý định, dấu hiệu nên dùng, dấu hiệu đừng dùng, và hiện thân sẵn có trong .NET."
tags: [cheatsheet, design-pattern, gof, dotnet]
domain: backend
category: pattern
doc_type: cheatsheet
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# 23 pattern GoF — tra nhanh

Trang này để tra khi **đang code**, không để học lần đầu. Học lần đầu thì đọc
[Design pattern là gì](../reference/what-is-a-pattern.md) rồi
[Chọn pattern nào](../reference/choosing-a-pattern.md).

## Creational — lấy object ở đâu ra

| Pattern | Một câu | Dùng khi | Đừng khi | Có sẵn trong .NET |
|---|---|---|---|---|
| [Singleton](../skills/singleton.md) | Đúng một thể hiện | Object bất biến không trạng thái | Có DI container — dùng `AddSingleton` | `Lazy<T>` |
| [Factory Method](../skills/factory-method.md) | Một chỗ quyết định `new` lớp nào | Loại chọn bằng dữ liệu lúc chạy | Danh sách cố định — dùng `switch` trên `enum` | Keyed services (.NET 8+) |
| [Abstract Factory](../skills/abstract-factory.md) | Cả một họ khớp nhau | Trộn nhầm họ gây sai âm thầm | Sản phẩm độc lập nhau | Module đăng ký DI theo môi trường |
| [Builder](../skills/builder.md) | Dựng nhiều bước, kiểm tra ở `Build()` | Có kiểm tra chéo giữa các field | Chỉ cần tên tham số — dùng `required` + object initializer | `WebApplication.CreateBuilder` |
| [Prototype](../skills/prototype.md) | Nhân bản thay vì dựng lại | Dựng tốn kém, cần nhiều biến thể | Object bất biến — chia sẻ là đủ | `record` + `with` (**nông!**) |

## Structural — lắp chúng vào nhau kiểu gì

| Pattern | Một câu | Dùng khi | Đừng khi | Có sẵn trong .NET |
|---|---|---|---|---|
| [Adapter](../skills/adapter.md) | Đổi hình dạng API cho khớp | Dùng thư viện ngoài từ ≥2 chỗ | Bạn sở hữu cả hai phía | Extension method (dạng nhẹ) |
| [Bridge](../skills/bridge.md) | Hai trục thành hai cây | Tên lớp con ghép từ 2 danh mục | Mới có một trục | — |
| [Composite](../skills/composite.md) | Lá và nhánh cùng interface | Cấu trúc lồng nhiều tầng | Chỉ một tầng — `List<T>` là đủ | Cây `Expression` |
| [Decorator](../skills/decorator.md) | Bọc để thêm hành vi | Log/cache/retry bật tắt được | Chỉ một hành vi, luôn bật | `Stream`, middleware, `DelegatingHandler` |
| [Facade](../skills/facade.md) | Một cửa cho nhiều bước | ≥2 chỗ lặp cùng trình tự | Chỉ một chỗ gọi | — |
| [Flyweight](../skills/flyweight.md) | Chia sẻ phần dùng chung | **Đã đo** và thấy tốn RAM | Chưa đo | String interning, `ArrayPool<T>` |
| [Proxy](../skills/proxy.md) | Chen vào trước khi chạm | Lazy, kiểm quyền, gọi xa | Object nhỏ và luôn dùng tới | `Lazy<T>`, EF lazy loading, `DispatchProxy` |

## Behavioral — ai gọi ai

| Pattern | Một câu | Dùng khi | Đừng khi | Có sẵn trong .NET |
|---|---|---|---|---|
| [Chain of Responsibility](../skills/chain-of-responsibility.md) | Ai nhận được thì dừng | Nhiều cấp duyệt, cấu hình được | 2–3 nhánh cố định | Middleware pipeline |
| [Command](../skills/command.md) | Yêu cầu là đối tượng | Cần undo, xếp hàng, chạy lại | `HoanTac()` sẽ rỗng | `ICommand`, MediatR, message queue |
| [Interpreter](../skills/interpreter.md) | Ngôn ngữ nhỏ thành cây | Quy tắc do **người dùng** viết | Lập trình viên viết — dùng `Expression<T>` | `System.Linq.Expressions` |
| [Iterator](../skills/iterator.md) | Duyệt không lộ cấu trúc | Luôn — đã có trong ngôn ngữ | — | `IEnumerable<T>`, `yield return` |
| [Mediator](../skills/mediator.md) | n×n thành n | ≥4 thành phần liên động | Quan hệ một chiều — dùng Observer | MediatR (khác bản chất) |
| [Memento](../skills/memento.md) | Ảnh chụp để khôi phục | Undo, checkpoint | Trạng thái rất lớn | `ImmutableList<T>` |
| [Observer](../skills/observer.md) | Một đổi, nhiều biết | Số người nghe thay đổi được | Thứ tự phản ứng quan trọng | `event`, `IObservable<T>` |
| [State](../skills/state.md) | Trạng thái biết đi đâu được | Có luật chuyển phải cưỡng chế | Không có luật chuyển — đó là một field | — |
| [Strategy](../skills/strategy.md) | Chọn thuật toán lúc chạy | Chọn bằng **dữ liệu** | Vẫn còn `switch` để chọn | `Func<>`, keyed services |
| [Template Method](../skills/template-method.md) | Khung cố định, vài bước mở | ≥3 bước biến thiên liên quan | 1 bước — dùng delegate | `HostedService` |
| [Visitor](../skills/visitor.md) | Thêm thao tác lên cây | Tập kiểu **ổn định**, thao tác tăng | Tập kiểu còn đổi | `ExpressionVisitor` |

## Các cặp hay lẫn — phép thử một câu

| Cặp | Hỏi |
|---|---|
| Adapter ↔ Facade | Bỏ lớp giữa đi, người gọi viết **1 dòng** (Adapter) hay **7 dòng** (Facade)? |
| Decorator ↔ Proxy | Bọc hai lớp cùng loại có nghĩa không? Có → Decorator |
| Strategy ↔ State | Gọi hai lần liên tiếp cho cùng kết quả không? Có → Strategy |
| Strategy ↔ Template Method | Đổi được lúc chạy không? Có → Strategy |
| Composite ↔ Decorator | Mấy con? Nhiều → Composite. Một → Decorator |
| Mediator ↔ Observer | Bên giữa có **luật** điều phối không? Có → Mediator |
| Builder ↔ Abstract Factory | Dựng **một** object phức tạp hay **một họ** object? |
| Memento ↔ Prototype | Bản sao để dùng song song (Prototype) hay để cất đi (Memento)? |

## Bốn dấu hiệu bạn đang dùng pattern quá sớm

1. Interface có **đúng một** lớp cài, không có kế hoạch cho cái thứ hai.
2. Bạn đặt tên `XxxFactory`/`XxxStrategy` **trước khi** viết logic.
3. Vẫn còn `switch` để chọn giữa các lớp vừa tách ra.
4. Phải vẽ sơ đồ mới giải thích nổi một luồng vốn chỉ có một nhánh.

**Rule of Three:** viết thẳng lần đầu, chịu đựng lần hai, trừu tượng hoá lần ba.

## Bảng chi phí thay đổi

Cột nào rẻ thì pattern đó tối ưu chiều đó — chọn theo trục nào hay đổi hơn.

| Cách tổ chức | Thêm **kiểu** mới | Thêm **thao tác** mới |
|---|---|---|
| Method trong lớp | rẻ | đắt — sửa mọi lớp |
| `switch` trên kiểu | đắt, **im lặng** | rẻ |
| [Visitor](../skills/visitor.md) | đắt, **trình biên dịch nhắc** | rẻ |
| [Strategy](../skills/strategy.md) + bảng đăng ký | rẻ | đắt — sửa interface |

## Related Topics

- [Chọn pattern nào](../reference/choosing-a-pattern.md) — tra ngược từ triệu chứng
- [Kỹ năng](../skills/index.md) — 23 trang chi tiết
- [Design pattern là gì](../reference/what-is-a-pattern.md) — và khi nào đừng dùng
- [SOLID](../reference/solid.md) — lý do đằng sau phần lớn bảng trên
