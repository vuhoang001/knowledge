# Nhật ký

Một file một ngày: `YYYY-MM-DD.md`. **Chỉ thêm, không sửa lại** — nhật ký là ảnh
chụp của một ngày, sửa nó là làm hỏng đường tìm lại theo thời gian.

## Ghi lúc nào

Trong lúc làm, không phải cuối ngày. Ghi thô, sai chính tả kệ, gạch đầu dòng cụt
cũng được. Dừng lại trau chuốt là lần sau không ghi nữa.

Mỗi ngày 5 phút. Đó là toàn bộ yêu cầu.

## Ghi gì

Ba mục trong khuôn [`../99-meta/tmpl-daily.md`](../99-meta/tmpl-daily.md):

1. **Làm gì** — một dòng mỗi việc. Đây là nguyên liệu cho worklog tháng.
2. **Vướng gì / sửa ra sao** — phần đáng giá nhất. Ghi cả cái *sai lúc đầu*.
3. **Đáng nhấc lên `02-notes`** — để trống cũng được, có gì thì cuối tuần xử lý.

Mục 2 là lý do thư mục này tồn tại. "Hôm nay sửa xong bug X" thì vô dụng; "tưởng là
lỗi timezone, hoá ra Trino trả `null` khi join hụt" thì sáu tháng sau cứu bạn.

## Cuối tuần

Đọc lại 5 file của tuần, nhấc thứ đáng giữ lên [`../02-notes/`](../02-notes/). Cái
gì không nhấc lên nổi thì để nó nằm đó — đó là tính năng, không phải lỗi.
