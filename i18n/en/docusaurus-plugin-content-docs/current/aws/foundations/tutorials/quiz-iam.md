---
title: "Câu hỏi: IAM"
i18n_status: untranslated
sidebar_position: 3
description: "Tự chấm phần IAM — user/group/role/policy, MFA, least privilege cho CLF-C02."
tags: [aws, clf-c02, quiz, iam]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

> **Chốt:** Tự chấm phần IAM. Che đáp án, trả lời trước, rồi mở `<details>` đối chiếu. Các câu kinh điển: EC2 cần S3 → role, chia quyền nhóm → group + policy, bảo vệ root, least privilege.

Phần lý thuyết: [IAM — Identity and Access Management](../reference/access-management.md).

## Câu hỏi

### Câu 1 (multiple choice)

IAM là loại dịch vụ nào về phạm vi?

- A. Gắn với một region cụ thể
- B. Gắn với một Availability Zone
- C. Global, không gắn region
- D. Gắn với một VPC

<details>
<summary>Đáp án</summary>

**C.** IAM là global service — user, group, role, policy dùng được ở mọi region, không phải tạo lại cho từng region. IAM cũng miễn phí.

</details>

### Câu 2 (multiple choice)

Một ứng dụng chạy trên EC2 instance cần đọc file từ một S3 bucket. Cách làm đúng và an toàn nhất là gì?

- A. Tạo IAM user, sinh access key và lưu vào source code của ứng dụng
- B. Lưu access key vào file cấu hình trên EC2 instance
- C. Gắn một IAM role (có quyền đọc S3) vào EC2 instance
- D. Dùng root user access key cho ứng dụng

<details>
<summary>Đáp án</summary>

**C.** Gắn **IAM role** vào EC2 instance; ứng dụng nhận credential tạm thời tự xoay vòng, không phải nhúng access key. A, B làm lộ credential tĩnh; D là cực kỳ sai (không bao giờ dùng root). Hễ thấy "service/EC2/Lambda cần truy cập dịch vụ khác" → nghĩ **role**.

</details>

### Câu 3 (multiple choice)

Bạn cần cấp cùng một bộ quyền cho 20 developer. Cách quản lý gọn nhất là gì?

- A. Gắn policy riêng vào từng user một
- B. Tạo một group, gắn policy vào group, thêm 20 user vào group
- C. Dùng chung một IAM user cho cả 20 người
- D. Cho cả 20 người dùng root user

<details>
<summary>Đáp án</summary>

**B.** Tạo **group**, gắn **policy** vào group, bỏ các user vào group — sửa quyền một chỗ là áp cho tất cả. A rườm rà, dễ lệch. C, D vi phạm nguyên tắc mỗi người một danh tính và bảo vệ root.

</details>

### Câu 4 (multiple choice)

Việc nào sau đây **bắt buộc** phải dùng root user?

- A. Tạo EC2 instance
- B. Đọc dữ liệu từ S3
- C. Đóng (close) AWS account
- D. Tạo IAM user mới

<details>
<summary>Đáp án</summary>

**C.** Một số tác vụ chỉ root làm được: đóng account, đổi account settings, đổi support plan, một số tác vụ billing. Các việc còn lại (A, B, D) nên làm bằng IAM user/role có quyền phù hợp.

</details>

### Câu 5 (multiple choice)

Biện pháp quan trọng nhất để bảo vệ root user là gì?

- A. Đổi password root mỗi ngày
- B. Bật MFA cho root và không dùng root hằng ngày
- C. Tạo thêm access key cho root
- D. Xóa root user đi

<details>
<summary>Đáp án</summary>

**B.** Bật **MFA** cho root, không dùng root cho việc hằng ngày, không tạo access key cho root. C làm tăng rủi ro; D không làm được (không thể xóa root của account).

</details>

### Câu 6 (multiple choice)

Policy trong IAM được viết ở định dạng nào?

- A. YAML
- B. XML
- C. JSON
- D. CSV

<details>
<summary>Đáp án</summary>

**C.** IAM policy là tài liệu **JSON**, cốt lõi gồm `Effect` (Allow/Deny), `Action`, `Resource`.

</details>

### Câu 7 (multiple choice)

Trong một statement của policy, trường `Effect` nhận giá trị nào?

- A. `Enable` hoặc `Disable`
- B. `Allow` hoặc `Deny`
- C. `Grant` hoặc `Revoke`
- D. `Public` hoặc `Private`

<details>
<summary>Đáp án</summary>

**B.** `Effect` chỉ có hai giá trị: `Allow` hoặc `Deny`.

</details>

### Câu 8 (multiple choice)

Một user có một policy `Allow s3:*` và một policy khác `Deny s3:DeleteObject`. User đó có xóa được object trong S3 không?

- A. Có, vì Allow rộng hơn
- B. Không, vì explicit Deny luôn thắng
- C. Tùy thứ tự gắn policy
- D. Chỉ xóa được nếu là root

<details>
<summary>Đáp án</summary>

**B.** **Explicit Deny luôn thắng** mọi Allow. Thứ tự thắng thua: explicit Deny > explicit Allow > implicit (mặc định) Deny.

</details>

### Câu 9 (multiple choice)

Một user mới tạo, chưa gắn policy nào, cố gọi một API. Kết quả?

- A. Được phép mọi thứ cho tới khi bị chặn
- B. Bị từ chối, vì mặc định là implicit deny
- C. Được phép đọc nhưng không được ghi
- D. Phải chờ admin phê duyệt từng request

<details>
<summary>Đáp án</summary>

**B.** Mặc định IAM là **implicit deny** — không có Allow nào khớp thì bị từ chối.

</details>

### Câu 10 (multiple choice)

Phân biệt nào đúng giữa password và access key?

- A. Password để gọi API/CLI; access key để đăng nhập Console
- B. Password để đăng nhập Console; access key để gọi API/CLI/SDK
- C. Cả hai đều chỉ dùng cho Console
- D. Cả hai đều chỉ dùng cho CLI

<details>
<summary>Đáp án</summary>

**B.** **Password** đăng nhập AWS Management Console (web); **access key** (Access Key ID + Secret) dùng cho API/CLI/SDK (lập trình).

</details>

### Câu 11 (multiple choice)

Nguyên tắc "least privilege" nghĩa là gì?

- A. Cấp càng nhiều quyền càng tốt để tránh lỗi thiếu quyền
- B. Chỉ cấp quyền tối thiểu đủ để hoàn thành công việc
- C. Chỉ cấp quyền cho admin
- D. Không cấp quyền cho ai cả

<details>
<summary>Đáp án</summary>

**B.** Least privilege = cấp **quyền tối thiểu đủ dùng**, thêm dần khi thực sự cần, thay vì cấp rộng rồi gỡ.

</details>

### Câu 12 (multiple choice)

Bạn muốn một báo cáo liệt kê tất cả IAM user cùng trạng thái MFA, access key và lần dùng cuối để audit. Dùng công cụ nào?

- A. Policy simulator
- B. Credential Report
- C. IAM Access Analyzer
- D. CloudFront

<details>
<summary>Đáp án</summary>

**B.** **Credential Report** là file CSV liệt kê mọi user cùng trạng thái credential (password, access key, MFA, lần dùng cuối) — dùng để audit.

</details>

### Câu 13 (multiple choice)

Bạn muốn quản lý đăng nhập tập trung cho nhiều AWS account và tích hợp với identity provider doanh nghiệp. Dịch vụ nào phù hợp nhất?

- A. IAM Identity Center (SSO)
- B. Credential Report
- C. Policy simulator
- D. Permission boundaries

<details>
<summary>Đáp án</summary>

**A.** **IAM Identity Center** (trước gọi AWS SSO) cho đăng nhập tập trung nhiều account và tích hợp identity provider ngoài.

</details>

### Câu 14 (multiple choice)

Phát biểu nào đúng về authentication và authorization?

- A. Authentication = được làm gì; authorization = bạn là ai
- B. Authentication = bạn là ai; authorization = được làm gì
- C. Cả hai cùng nghĩa
- D. Authentication chỉ áp cho root

<details>
<summary>Đáp án</summary>

**B.** Authentication = xác minh danh tính (*bạn là ai*, ví dụ password + MFA); authorization = cấp quyền (*được làm gì*, do policy quyết định).

</details>

### Câu 15 (multiple response)

Chọn TẤT CẢ các phát biểu đúng về IAM group. (Chọn 2)

- A. Group có thể chứa nhiều user
- B. Group có credential riêng để đăng nhập Console
- C. Có thể gắn policy vào group và mọi user trong group thừa hưởng
- D. Group có thể lồng trong group khác

<details>
<summary>Đáp án</summary>

**A và C.** Group gom nhiều user (A) và bạn gắn policy vào group để các user thừa hưởng (C). B sai — group **không có credential**, không đăng nhập được. D sai — **không lồng group trong group**.

</details>

### Câu 16 (multiple response)

Những cách nào giúp giảm rủi ro lộ hoặc lạm dụng credential? (Chọn 3)

- A. Dùng IAM role với credential tạm thời cho workload thay vì access key tĩnh
- B. Bật MFA cho các user quan trọng
- C. Nhúng access key của admin vào source code để tiện dùng lại
- D. Áp dụng least privilege, chỉ cấp quyền tối thiểu cần thiết

<details>
<summary>Đáp án</summary>

**A, B, D.** Role cho credential tạm thời tự xoay vòng (A), MFA thêm một lớp bảo vệ (B), least privilege giới hạn thiệt hại khi lộ (D). C là anti-pattern — không bao giờ nhúng access key vào code.

</details>

## Related Topics

- [IAM — Identity and Access Management](../reference/access-management.md)
- [Mục lục AWS (CLF-C02)](../index.md)
