# Chủ đề — học một công nghệ

Một công nghệ một file. Mỗi file vừa là **lộ trình học**, vừa là **mục lục** cho mọi
ghi chú thuộc công nghệ đó. Khuôn: [`../99-meta/tmpl-topic.md`](../99-meta/tmpl-topic.md)

Đây là trái tim của kho — nơi nguyên tắc "không ghi chú nào mồ côi" được thi hành.

## Mục lục

| Chủ đề | Bậc | Mục tiêu | Ôn lại |
|---|---|---|---|
| [dbt](dbt.md) | L0 | Mang test trở lại lakehouse HDOS | chưa bắt đầu |
| [Kafka](kafka.md) | L0 | Hiểu đường CDC realtime của HDOS | chưa bắt đầu |
| [Flink](flink.md) | L0 | Dựng lại job CDC → `hdos_bronze` | chưa bắt đầu |
| [Iceberg](iceberg.md) | L0 | Làm chủ table format đang chạy thật | chưa bắt đầu |
| [Trino](trino.md) | L0 | Đọc được query chậm và sửa | chưa bắt đầu |
| [Airflow](airflow.md) | L0 | Điều phối batch HIS → bronze → gold | chưa bắt đầu |

## Khi một file không đủ nữa

**Bắt đầu bằng MỘT file. Chỉ tách khi nó thực sự chật.**

Dựng sẵn thư mục cho thứ chưa viết là cách chắc chắn nhất để bỏ dở — đó là lỗi đã
giết lần thử trước.

Dấu hiệu tách: file vượt **~300 dòng**, hoặc có từ **3 mảng lý thuyết riêng biệt**
mà mảng nào cũng cần vài trăm chữ.

Cách tách — file cũ thành `README.md` của thư mục cùng tên:

```
kafka.md                          →   kafka/
                                      ├── README.md                    bản đồ + lộ trình + MỤC LỤC
                                      ├── ly-thuyet-consumer-group.md
                                      ├── ly-thuyet-partition-offset.md
                                      ├── cach-dung-cau-hinh-retention.md
                                      └── bai-tap-01-producer-consumer.md
```

Bốn tiền tố, đúng bốn thứ cần cho một công nghệ:

| Tiền tố | Trả lời câu | Ví dụ |
|---|---|---|
| `ly-thuyet-` | Bên trong nó hoạt động thế nào | `ly-thuyet-watermark.md` |
| `cach-dung-` | Gõ gì, cấu hình ra sao | `cach-dung-checkpoint.md` |
| `bai-tap-NN-` | Chạy thật, có output | `bai-tap-02-event-time.md` |
| `README.md` | Vào từ đâu, học theo thứ tự nào | luôn là trang chủ |

**Phẳng, không lồng thêm thư mục con.** Giữ đúng 2 tầng, tiền tố tự gom nhóm khi
sắp xếp, và mở thư mục ra là thấy hết. `README.md` giữ vai trò mục lục — mọi file
con phải được nó trỏ tới.

## Thang bậc — biết mình đang ở đâu

Đừng hỏi "học xong chưa", hỏi "đang ở bậc nào". Bốn bậc, kiểm chứng được:

| Bậc | Nghĩa là | Cách tự kiểm |
|---|---|---|
| **L1 Hiểu** | Nói được nó giải quyết vấn đề gì, khác gì thứ gần giống | Giải thích trong 2 phút, không mở tài liệu |
| **L2 Chạy được** | Dựng được ví dụ tối thiểu chạy thật | Có output dán vào file |
| **L3 Sửa được** | Nó hỏng thì đọc lỗi và tự sửa | Đã tự gỡ ≥3 lỗi, ghi trong mục "Sai lầm" |
| **L4 Thiết kế được** | Chọn được cách làm cho bài toán mới, nói được đánh đổi | Đã dùng trong việc thật và bảo vệ được lựa chọn |

**L3 là mức đủ dùng cho công việc.** L4 chỉ cần cho thứ mình sở hữu lâu dài. Đặt mục
tiêu L4 cho mọi công nghệ là cách chắc chắn nhất để không xong cái nào.

## Phương pháp

Năm điều dưới đây không phải mẹo vặt — đó là những kỹ thuật học có bằng chứng mạnh
nhất, cộng một thứ đặc thù cho dân hạ tầng.

**1. Neo vào một mục tiêu thật.** Viết xong ô *Mục tiêu* trước khi mở tài liệu: học
xong dùng vào việc gì trong HDOS. Không viết được thì chưa đến lúc học nó. Não giữ
thứ nó cần dùng — "học dbt cho biết" quên sau ba tuần.

**2. Học chủ động, không đọc lại.** Đọc lại tài liệu cho *cảm giác* đã hiểu; cảm giác
đó sai, và nó là lý do người ta học mãi không vào. Thứ tạo ra trí nhớ là **cố nhớ lại
khi chưa nhìn tài liệu**. Nên mỗi file có mục *Tự kiểm*: gấp tài liệu, trả lời miệng,
rồi mới mở đối chiếu. Câu nào sai — đó chính là chỗ phải học lại, không phải học lại
từ đầu.

**3. Ôn giãn cách.** Mốc **1 → 3 → 7 → 21 → 60 ngày**. Nhớ được thì đẩy sang mốc sau,
quên thì lùi về mốc đầu. Ghi `next-review` trong frontmatter, rồi
`python3 99-meta/on-tap.py` sẽ nhắc.

**4. Học xen kẽ là ĐÚNG.** "Nay dbt mai Kafka thì loạn" — ngược lại: xen kẽ nhiều chủ
đề cho kết quả dài hạn **tốt hơn** cày một chủ đề liên tục. Học dồn cho cảm giác trôi
chảy nhưng quên nhanh; xen kẽ khó chịu hơn lúc học nhưng nhớ lâu và dạy được cách
*chọn* công cụ đúng. Điều kiện: mỗi chủ đề một file và có lịch ôn. Xen kẽ mà không
ghi mới là loạn.

**5. Chưa chạy được thì chưa gọi là học.** dbt, Kafka, Flink, Iceberg không phải kiến
thức đọc hiểu. Đọc hết docs Kafka mà chưa từng để consumer group rebalance thì chưa
biết gì về Kafka. Nên bài tập nào cũng phải **chạy thật, có output dán lại được**.

## Nhịp

| Khi nào | Làm gì |
|---|---|
| Trong lúc học | Ghi thô vào [`../01-daily/`](../01-daily/), đừng dừng lại trau chuốt |
| Hết một buổi | Cập nhật file chủ đề: thêm câu tự kiểm, đặt `next-review` |
| Mỗi sáng | `on-tap.py`, ôn cái đến hạn (10–15 phút) |
| Cuối tuần | Nhấc từ daily lên `02-notes`, nâng bậc nếu đủ bằng chứng |
