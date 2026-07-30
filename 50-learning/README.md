# Học một công nghệ mới — phương pháp

Mỗi công nghệ **một file** trong thư mục này. Khuôn ở
[`../99-templates/learning-topic.md`](../99-templates/learning-topic.md).

Phần này không phải mẹo vặt. Bốn thứ dưới đây là những kỹ thuật học có bằng chứng
mạnh nhất trong tâm lý học nhận thức, cộng một thứ đặc thù cho dân hạ tầng.

## 1. Neo vào một mục tiêu thật, không học "cho biết"

Trước khi mở tài liệu, viết xong ô **Mục tiêu**: học xong dùng vào việc gì trong
HDOS. Không viết được thì chưa đến lúc học nó.

Não giữ thứ nó cần dùng. "Học dbt cho biết" quên sau 3 tuần; "học dbt để mang test
trở lại lakehouse HDOS sau khi repo bị thu gọn" thì mỗi khái niệm có chỗ để bám.

## 2. Học chủ động, không đọc lại

Đọc lại tài liệu cho *cảm giác* đã hiểu — cảm giác đó sai, và nó là lý do người ta
học mãi không vào. Thứ thật sự tạo trí nhớ là **cố nhớ lại khi chưa nhìn tài liệu**.

Thực hành: mỗi file có mục **Tự kiểm** — danh sách câu hỏi. Ôn bài = gấp tài liệu,
trả lời miệng, rồi mới mở ra đối chiếu. Câu nào trả lời sai thì đó chính là chỗ
phải học lại, không phải học lại từ đầu.

## 3. Ôn giãn cách, đừng học dồn

Ôn lại ở các mốc **1 ngày → 3 ngày → 1 tuần → 3 tuần → 2 tháng**. Mỗi lần nhớ lại
thành công thì đẩy mốc sau ra xa hơn; quên thì lùi về mốc đầu.

Ghi trong frontmatter của file:

```yaml
next-review: 2026-08-06
```

Rồi `python3 tools/on-tap.py` liệt kê hôm nay phải ôn gì. Đây là phần "thông minh"
mà không cần app nào — repo tự nói cho bạn biết.

## 4. Học xen kẽ là ĐÚNG, không phải mất tập trung

Bạn lo "nay dbt mai Kafka thì loạn". Ngược lại: xen kẽ nhiều chủ đề cho kết quả dài
hạn **tốt hơn** cày một chủ đề liên tục. Học dồn cho cảm giác trôi chảy nhưng quên
nhanh; xen kẽ khó chịu hơn lúc học nhưng nhớ lâu và biết *chọn* công cụ đúng — điều
mà học dồn không dạy được.

Điều kiện: mỗi chủ đề phải có file riêng và có lịch ôn. Xen kẽ mà không ghi thì mới
là loạn.

## 5. Với hạ tầng: chưa chạy được thì chưa gọi là học

dbt, Kafka, Flink, Iceberg không phải kiến thức đọc hiểu. Đọc xong docs Kafka mà
chưa từng để consumer group rebalance thì chưa biết gì về Kafka.

Nên mỗi file có mục **Bài tập** và bài tập nào cũng phải **chạy thật, có output dán
lại được**. Không có bài tập chạy được thì phần lý thuyết đó chưa tính là học xong.

## Thang bậc — biết mình đang ở đâu

Đừng hỏi "học xong chưa", hỏi "đang ở bậc nào". Bốn bậc, kiểm chứng được:

| Bậc | Nghĩa là | Cách tự kiểm |
|---|---|---|
| **L1 Hiểu** | Nói được nó giải quyết vấn đề gì, khác gì thứ gần giống | Giải thích trong 2 phút, không mở tài liệu |
| **L2 Chạy được** | Dựng được ví dụ tối thiểu chạy thật | Có output dán vào file |
| **L3 Sửa được** | Nó hỏng thì đọc lỗi và tự sửa | Đã tự gỡ ≥3 lỗi, ghi lại trong "Sai lầm" |
| **L4 Thiết kế được** | Chọn được cách làm cho bài toán mới, nói được đánh đổi | Đã dùng trong việc thật và bảo vệ được lựa chọn |

**L3 là mức đủ dùng cho công việc.** L4 chỉ cần cho thứ mình sở hữu lâu dài. Đặt
mục tiêu L4 cho mọi công nghệ là cách chắc chắn nhất để không xong cái nào.

## Nhịp làm việc

| Khi nào | Làm gì |
|---|---|
| Trong lúc học | Ghi thô vào `../10-daily/`, đừng dừng lại trau chuốt |
| Hết một buổi học | Cập nhật file chủ đề: thêm câu tự kiểm, đặt `next-review` |
| Mỗi sáng | `python3 tools/on-tap.py`, ôn cái đến hạn (10–15 phút) |
| Cuối tuần | Nhấc thứ đáng giữ từ daily lên `../20-notes/`, nâng bậc nếu đủ bằng chứng |

## Mục lục chủ đề

| Chủ đề | Bậc | Mục tiêu | Ôn lại |
|---|---|---|---|
| [dbt](dbt.md) | L0 | Mang test trở lại lakehouse HDOS | chưa bắt đầu |

<!-- Thêm dòng mới mỗi khi tạo một file chủ đề. Giữ bảng này ngắn — nó là bảng
     điều khiển, không phải kho. -->
