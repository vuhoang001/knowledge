---
title: Design Patterns
description: "23 pattern Gang of Four bằng C#, mỗi cái kèm một ca hỏng chạy được và mục khi nào đừng dùng."
tags: [design-pattern, gof, oop, backend]
domain: backend
category: pattern
doc_type: index
status: draft
difficulty: intermediate
updated: 2026-08-04
---

# Design Patterns

**Đây là nhóm *khái niệm*, không phải công nghệ.** Gang of Four viết những thứ này năm
1994 bằng C++ và Smalltalk, và chúng vẫn mô tả đúng code C# năm 2026 — trong khi ngôn ngữ
đã đi qua mười ba phiên bản.

Vì thế đây là phần **mất giá chậm** giống như [Data Modeling](../data-modeling/index.md).
Học framework là học cách gõ lệnh; biết vì sao Decorator tồn tại thì đổi sang ngôn ngữ nào
cũng nhận ra nó.

> Chỗ này trả lời câu **"sắp xếp các lớp thế nào"**, không phải "chạy bằng gì". Mọi ví dụ
> viết bằng C# vì nó cần một ngôn ngữ cụ thể để chạy được, không phải vì pattern thuộc về
> C#.

**Một cảnh báo đặt ngay đầu trang:** phần lớn thiệt hại từ design pattern không đến từ việc
không biết chúng, mà từ việc dùng đúng công thức ở sai chỗ. Mỗi trang trong kho này đều có
mục *Khi nào KHÔNG dùng*, và
[ca hỏng số 19](case-studies/abstract-factory-cho-mot-hien-thuc.md) dành riêng cho lỗi đó.

## Nội dung

Năm nhóm chuẩn — **mọi chủ đề trong kho đều dùng đúng bộ này**.

### [Tài liệu](reference/index.md) — nó là gì, vì sao, đánh đổi ra sao

| # | Tài liệu | Trả lời câu hỏi | Mức | Trạng thái |
|---|---|---|---|---|
| 1 | [Design pattern là gì](reference/what-is-a-pattern.md) | Pattern là gì, ba nhóm, và **khi nào đừng dùng** | beginner | 📝 lý thuyết |
| 2 | [SOLID](reference/solid.md) | Năm nguyên lý, mỗi cái một vi phạm chạy ra lỗi thật | intermediate | 📝 lý thuyết |
| 3 | [Composition over inheritance](reference/composition-over-inheritance.md) | Kế thừa nhân số lớp, composition cộng — 72 so với 11 | intermediate | 📝 lý thuyết |
| 4 | [Coupling và cohesion](reference/coupling-cohesion.md) | Đo fan-out bằng reflection; thước đo pattern phục vụ | intermediate | 📝 lý thuyết |
| 5 | [Chọn pattern nào](reference/choosing-a-pattern.md) | Tra ngược từ triệu chứng trong code sang tên pattern | intermediate | 📝 lý thuyết |

### [Kỹ năng](skills/index.md) — 23 pattern GoF

| Nhóm | Trả lời câu hỏi | Pattern |
|---|---|---|
| **Creational** (1–5) | Đối tượng **lấy đâu ra** | [Singleton](skills/singleton.md) · [Factory Method](skills/factory-method.md) · [Abstract Factory](skills/abstract-factory.md) · [Builder](skills/builder.md) · [Prototype](skills/prototype.md) |
| **Structural** (6–12) | Chúng **lắp vào nhau** kiểu gì | [Adapter](skills/adapter.md) · [Bridge](skills/bridge.md) · [Composite](skills/composite.md) · [Decorator](skills/decorator.md) · [Facade](skills/facade.md) · [Flyweight](skills/flyweight.md) · [Proxy](skills/proxy.md) |
| **Behavioral** (13–23) | **Ai gọi ai** | [Chain of Responsibility](skills/chain-of-responsibility.md) · [Command](skills/command.md) · [Interpreter](skills/interpreter.md) · [Iterator](skills/iterator.md) · [Mediator](skills/mediator.md) · [Memento](skills/memento.md) · [Observer](skills/observer.md) · [State](skills/state.md) · [Strategy](skills/strategy.md) · [Template Method](skills/template-method.md) · [Visitor](skills/visitor.md) |

### Ba nhóm còn lại

| Nhóm | Nội dung |
|---|---|
| [Bài tập](tutorials/index.md) | [Leo thang từ `switch` tới Strategy + Decorator](tutorials/refactor-switch-sang-pattern.md) — bốn bậc, và biết dừng ở bậc nào |
| [Cheatsheet](cheatsheets/index.md) | [23 pattern GoF — tra nhanh](cheatsheets/gof-23.md) |
| [Case study](case-studies/index.md) | **19 ca** — mỗi pattern có ít nhất một ca hỏng có số |

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 lý thuyết, `verified_at` còn trống

## Vì sao tách "Tài liệu" và "Kỹ năng"

Biết Strategy là gì (khái niệm) **không** đồng nghĩa với biết khi nào nên dùng nó (cách
làm). Phần lớn tài liệu trên mạng chỉ dạy vế đầu — chép sơ đồ UML kèm một ví dụ, rồi hết.
Vế thứ hai mới là chỗ mất tiền:

- Dùng Strategy cho luồng **có luật chuyển trạng thái** → luật nằm rải ở mọi người gọi, và
  [đơn chưa thanh toán vẫn giao được](case-studies/chuyen-trang-thai-trai-phep.md).
- Dựng Abstract Factory cho **một** hiện thực → bốn kiểu thừa, và ba năm sau vẫn một
  hiện thực.

Cả hai lỗi đều **không phải lỗi kỹ thuật**. Code đúng, test xanh, mọi chỉ số chất lượng
đẹp. Sai ở bước quyết định trước khi viết dòng đầu tiên.

## Learning Path

```text
C# co ban (interface, ke thua, delegate)
      ↓
Design pattern la gi        ← bat dau o day
      ↓
SOLID
      ↓
Composition over inheritance · Coupling va cohesion
      ↓
Strategy · Factory Method · Adapter · Decorator     ← bon cai gap nhieu nhat
      ↓
Lab: leo thang tu switch toi Strategy + Decorator   ← chay that o day
      ↓
Chon pattern nao (tra nguoc tu trieu chung)
      ↓
19 pattern con lai, doc theo nhu cau
      ↓
Case study: doc truoc khi ap pattern, khong phai sau
```

**Đường ngắn nhất tới chỗ dùng được:** *Design pattern là gì* → *Chọn pattern nào* → Lab.
Hai trang đầu đủ để bắt đầu tra cứu; 23 trang còn lại là tài liệu tra, không phải giáo
trình đọc tuần tự.

## Bản đồ so với danh sách GoF

| Nhóm GoF | Số pattern | Đã phủ | Có case study riêng |
|---|---|---|---|
| Creational | 5 | 5 | 5 |
| Structural | 7 | 7 | 7 |
| Behavioral | 11 | 11 | 11 |

Toàn bộ **23 pattern** đã có trang riêng, và mỗi trang có ít nhất một case study trỏ tới.
Phần nền tảng (SOLID, coupling, composition) cũng được phủ.

Phủ hết danh sách **không** phải mục tiêu tự thân. Giá trị nằm ở chỗ mỗi pattern đi kèm
một ca hỏng có số chạy thật — đọc bảng đánh đổi thì quên, nhớ được là con số.

## Ba pattern đọc để **biết mà tránh**

| Pattern | Vì sao |
|---|---|
| [Singleton](skills/singleton.md) | Gần như luôn nên thay bằng vòng đời singleton của DI container |
| [Interpreter](skills/interpreter.md) | Hiếm khi đúng chỗ; `Expression<T>` thường là câu trả lời |
| [Visitor](skills/visitor.md) | Đắt khi tập kiểu còn đổi; `switch` biểu thức đủ cho phần lớn ca |

## Môi trường chạy ví dụ

Mọi ví dụ trong kho này chạy bằng **file-based app** của .NET, không cần tạo project:

```bash
dotnet run vi-du.cs
```

Cần .NET 10 trở lên. Phiên bản dùng để chạy các output trong kho:

```text
11.0.100-preview.1.26104.118
```

Lần chạy đầu mất ~40 giây (khôi phục gói), các lần sau dưới 1 giây. Đặt file lab **ngoài
repo này**, ví dụ `~/Documents/learn-lab/patterns`.

## Related Topics

- [Data Modeling](../data-modeling/index.md) — cùng loại tri thức mất giá chậm
- [Backend](../backend/index.md) — nơi các pattern này được dùng
- [Architecture](../architecture/index.md) — quy mô lớn hơn: tầng và module
- [Glossary](../glossary/index.md)
