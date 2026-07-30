---
type: note
tags: [frontend, api, pagination]
next-review:
updated: 2026-07-30
---

# Bảng đã phân trang phía server thì không được lọc ở client

## Vấn đề

Rà 47 bảng của `hdos-v3` để thêm phân trang + lọc. Cám dỗ lớn nhất là bọc **tất cả**
bằng một component lọc client cho đồng bộ. Làm vậy là hỏng một nửa số bảng.

## Hiểu ra gì

Có hai kiểu bảng, và chúng **không** được xử lý giống nhau:

| | Phân trang client | Phân trang server |
|---|---|---|
| Nguồn dữ liệu | Đã cầm trọn mảng trong tay | Mỗi lần chỉ nhận một trang |
| Tổng số dòng | `dataSource.length` | `total` từ response |
| Lọc | Lọc tại chỗ, tức thì | Phải gửi tham số xuống backend |

**Dấu hiệu nhận biết:** `total` đến từ đâu. Lấy từ `data.total` của response là
server-side; đếm `dataSource.length` là client-side.

Lọc client trên bảng server-paginated thì chỉ lọc được **đúng trang đang cầm**. Kết
quả sai mà nhìn vẫn hợp lý — bảng hiện ra vài dòng, người dùng tin đó là toàn bộ kết
quả lọc, trong khi 9 trang còn lại chưa từng được xét. Đây là kiểu lỗi tệ nhất: không
crash, không cảnh báo, chỉ âm thầm trả lời sai.

## Quy tắc rút ra

1. Trước khi thêm lọc, xác định bảng thuộc kiểu nào — nhìn `total`.
2. Server-paginated → thêm tham số vào endpoint, đừng đụng vào phía client.
3. Nếu backend chưa hỗ trợ lọc thì **để nguyên**, đừng bù bằng lọc client.
4. Bảng tổng hợp vài dòng cố định (KPI, benchmark) thì **không cần phân trang** —
   gắn pager vào bảng 5 dòng chỉ là nhiễu.

Điểm 4 đáng nhắc riêng: "làm cho đủ" là bản năng sai. Phân trang chỉ dành cho danh
sách **không giới hạn số dòng**.

## Sai lầm lúc đầu

Định làm hết 47 bảng cho đồng đều. Rà kỹ mới thấy khoảng một nửa hoặc đã có lọc phía
server rồi (M07 kho thuốc, M10 chất lượng, các drawer drill-down), hoặc là bảng tổng
hợp cố định. Số thật sự cần làm: 17.

## Liên kết

- [[dbt]] — cùng một lớp sai: áp một khuôn chung lên dữ liệu có grain khác nhau
- Repo `hdos-v3`: `src/shared/ui/data-table.tsx`
