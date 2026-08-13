---
title: Case study — Design Patterns
sidebar_key: patterns-case-studies
sidebar_position: 0
description: "Mười chín kiểu hỏng khi dùng pattern sai chỗ, mỗi ca kèm triệu chứng có số, giả thuyết sai lúc đầu, và cách sửa."
tags: [case-study, design-pattern]
domain: backend
category: index
doc_type: index
updated: 2026-08-04
---

# Case study — Design Patterns

Mười chín kiểu hỏng. Mỗi bài đi theo cùng một mạch: **triệu chứng → giả thuyết sai lúc đầu
→ nguyên nhân thật → vì sao không test nào bắt được → cách sửa → dấu hiệu nhận ra sớm**.

> **Đây là tình huống dựng lại**, không phải sự cố đã gặp trong kho này. Bù lại, **mọi con
> số đều chạy thật bằng `dotnet run <file>.cs` trên .NET 11.0.0**, dán lại là ra y hệt.

| # | Sự cố | Bài học | Kỹ thuật liên quan |
|---|---|---|---|
| 1 | [Test xanh khi chạy riêng, đỏ khi chạy chung](test-xanh-rieng-do-chung.md) | Singleton là trạng thái toàn cục; fan-out đo được là 0, thật là 1 | [Singleton](../skills/singleton.md) |
| 2 | [Thêm định dạng thứ năm, sáu chỗ bỏ sót](them-loai-thu-nam-sua-bay-cho.md) | Nhánh mặc định là thủ phạm, không phải cứu tinh | [Factory Method](../skills/factory-method.md) |
| 3 | [In 183 tờ giấy thành 242](constructor-chin-tham-so-hoan-vi.md) | Hai tham số cùng kiểu cạnh nhau là chỗ hoán vị được | [Builder](../skills/builder.md) |
| 4 | [Sửa bản sao, bản gốc đổi theo](nhan-ban-doi-tuong-dung-chung-list.md) | `record with` cũng là sao chép nông | [Prototype](../skills/prototype.md) |
| 5 | [Báo cáo thiếu 4,2 triệu, không có lỗi nào](adapter-nuot-loi-thanh-danh-sach-rong.md) | `catch { return null; }` biến sự cố thành dữ liệu sai | [Adapter](../skills/adapter.md) |
| 6 | [Thêm một tuỳ chọn, sinh thêm 36 lớp](mot-tram-lop-con-cho-mot-tinh-nang.md) | Kế thừa nhân, composition cộng: 72 so với 11 | [Bridge](../skills/bridge.md) |
| 7 | [Tiến trình chết không để lại log nào](duyet-cay-khong-bao-gio-dung.md) | `StackOverflowException` không bắt được — phải phòng, không thể xử lý | [Composite](../skills/composite.md) |
| 8 | [Thực tập sinh đọc được bảng lương](doi-thu-tu-decorator-mat-cache.md) | Cache ngoài kiểm quyền là thủng phân quyền | [Decorator](../skills/decorator.md) |
| 9 | [Facade một method thành 31 method](facade-phinh-thanh-god-object.md) | Gom theo danh mục thì không có giới hạn; gom theo ca dùng thì có | [Facade](../skills/facade.md) |
| 10 | [Tô đỏ một ô, cả bảng đỏ theo](flyweight-chia-se-nham-trang-thai.md) | Đối tượng dùng chung **phải** bất biến | [Flyweight](../skills/flyweight.md) |
| 11 | [Một dòng truy cập property thành 501 truy vấn](lazy-proxy-sinh-n-cong-mot-query.md) | Proxy giấu chi phí I/O quá tốt | [Proxy](../skills/proxy.md) |
| 12 | [Yêu cầu đổi hàng biến mất, không ai báo](request-roi-qua-het-chain.md) | Chuỗi không có `else` — phải tự thêm mắt xích chốt | [Chain of Responsibility](../skills/chain-of-responsibility.md) |
| 13 | [Hoàn tác hai lệnh, tồn kho từ 10 thành 24](undo-khong-tra-lai-trang-thai-cu.md) | `HoanTac` phải dựa vào cái đã xảy ra, không phải cái được yêu cầu | [Command](../skills/command.md) |
| 14 | [8,4 MB rò rỉ sau 2000 lần mở màn hình](su-kien-giu-doi-tuong-khong-cho-gc.md) | Nguồn giữ observer, không phải ngược lại | [Observer](../skills/observer.md) |
| 15 | [Giao hàng trước khi khách trả tiền](chuyen-trang-thai-trai-phep.md) | Luật chuyển trạng thái không nằm trong code thì không tồn tại | [State](../skills/state.md) |
| 16 | [Một lớp con nhận cả dòng dữ liệu hỏng](lop-con-quen-goi-base.md) | `virtual` có logic chung là bẫy; hook phải rỗng | [Template Method](../skills/template-method.md) |
| 17 | [Thêm một toán tử, sáu nơi phải sửa](them-node-moi-sua-moi-visitor.md) | Trình biên dịch nhắc, hay production nhắc | [Visitor](../skills/visitor.md) |
| 18 | [Job đêm chết vì một dòng `RemoveAll`](sua-list-dang-duyet.md) | `IEnumerable` không phải tập hợp, là công thức | [Iterator](../skills/iterator.md) |
| 19 | [Sáu kiểu để làm việc của hai kiểu](abstract-factory-cho-mot-hien-thuc.md) | Over-engineering làm **mọi** chỉ số chất lượng đẹp lên | [Abstract Factory](../skills/abstract-factory.md) |

## Điểm chung của cả mười chín

Đọc hết thì thấy bốn mô-típ lặp lại:

| Mô-típ | Xuất hiện ở ca |
|---|---|
| **Nhánh mặc định che lỗi** — `_ =>` trả về giá trị "an toàn" thay vì ném | 2, 5, 12, 17 |
| **Chia sẻ tham chiếu ngoài ý muốn** — nông thay vì sâu, hoặc dùng chung thay vì bất biến | 1, 4, 10 |
| **Chi phí trở nên vô hình** — thứ tự bọc, số truy vấn, số lần tính | 8, 11, 18 |
| **Luật không có chủ** — nằm trong tài liệu, trong đầu người, không trong code | 2, 9, 15, 16 |

Và một điểm chung lớn hơn: **trong 19 ca, chỉ 3 ca có exception.** Mười sáu ca còn lại chạy
xanh, cho ra kết quả sai hoặc chi phí sai, và được phát hiện bởi con người chứ không bởi
công cụ.

Đó là lý do mục *"vì sao không test nào bắt được"* có trong mọi bài.

## Related Topics

- [Design Patterns](../index.md) — chủ đề chứa thư mục này
- [Kỹ năng](../skills/index.md) — 23 pattern GoF
- [Tài liệu](../reference/index.md) — nền tảng
- [Cheatsheet 23 GoF](../cheatsheets/gof-23.md) — bảng một trang
