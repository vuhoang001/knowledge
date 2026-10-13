---
title: "Câu hỏi: IAM"
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

**C.** IAM là **global service** — mọi user, group, role và policy bạn tạo đều có hiệu lực ở tất cả region, bạn không tạo lại chúng cho từng region.

AWS chia dịch vụ thành loại gắn region (như EC2, RDS — tài nguyên sống trong một region) và loại global (như IAM, Route 53, CloudFront). IAM thuộc nhóm global vì danh tính và quyền phải nhất quán trên toàn account; ngoài ra IAM còn miễn phí.

- A sai: IAM không phải region-scoped; nếu nó gắn region thì user bạn tạo ở `us-east-1` sẽ không dùng được ở region khác — không phải vậy.
- B sai: Availability Zone là tầng hạ tầng bên trong region, không có dịch vụ nào "gắn với một AZ" theo kiểu này; danh tính càng không nằm ở tầng AZ.
- D sai: VPC là mạng riêng ảo trong một region, chỉ liên quan tới tài nguyên mạng; IAM không nằm trong VPC.

📌 Nhớ cho đề: IAM = global + miễn phí. Thấy "IAM" và "region" trong một câu thì gần như chắc đáp án là "không gắn region".

</details>

### Câu 2 (multiple choice)

Một ứng dụng chạy trên EC2 instance cần đọc file từ một S3 bucket. Cách làm đúng và an toàn nhất là gì?

- A. Tạo IAM user, sinh access key và lưu vào source code của ứng dụng
- B. Lưu access key vào file cấu hình trên EC2 instance
- C. Gắn một IAM role (có quyền đọc S3) vào EC2 instance
- D. Dùng root user access key cho ứng dụng

<details>
<summary>Đáp án</summary>

**C.** Gắn một **IAM role** (có quyền đọc S3) vào EC2 instance; ứng dụng trên instance tự nhận credential tạm thời, tự xoay vòng, không ai phải nhúng hay quản lý access key tĩnh.

IAM role là danh tính không có credential cố định: một dịch vụ (EC2, Lambda...) hay một user "assume" role đó và nhận về credential tạm thời có thời hạn. Đây là pattern chuẩn cho "một dịch vụ cần truy cập dịch vụ khác" — key tĩnh rò rỉ thì vĩnh viễn nguy hiểm, còn credential tạm thời thì hết hạn và tự làm mới.

- A sai: access key tĩnh nhúng trong source code là lỗi bảo mật kinh điển — code lên Git/chia sẻ là lộ key, và key không tự xoay vòng.
- B sai: lưu key vào file cấu hình trên instance vẫn là credential tĩnh, vẫn lộ nếu ai đó truy cập được instance, và bạn phải tự xoay vòng thủ công.
- D sai: dùng root access key là sai nghiêm trọng nhất — root có toàn quyền account, không nên tạo access key cho root, càng không đưa vào ứng dụng.

📌 Nhớ cho đề: thấy "EC2 / Lambda / service cần truy cập dịch vụ AWS khác" → chọn **IAM role**. Thấy "lưu/nhúng access key" → sai.

</details>

### Câu 3 (multiple choice)

Bạn cần cấp cùng một bộ quyền cho 20 developer. Cách quản lý gọn nhất là gì?

- A. Gắn policy riêng vào từng user một
- B. Tạo một group, gắn policy vào group, thêm 20 user vào group
- C. Dùng chung một IAM user cho cả 20 người
- D. Cho cả 20 người dùng root user

<details>
<summary>Đáp án</summary>

**B.** Tạo một **group**, gắn **policy** vào group, rồi bỏ 20 user vào group — về sau sửa quyền ở một chỗ (policy của group) là áp cho tất cả thành viên.

IAM group là cách gom user có cùng vai trò để quản lý quyền theo lô. Thay vì lặp lại quyền trên từng user, bạn gắn policy một lần vào group; thêm/bớt người chỉ là thêm/bớt thành viên. Đây chính là mô hình quản lý quyền theo nhóm mà least privilege khuyến khích.

- A sai: gắn policy riêng cho 20 user là 20 lần thao tác, dễ lệch nhau và cập nhật rất mệt — không "gọn nhất".
- C sai: dùng chung một IAM user phá vỡ nguyên tắc mỗi người một danh tính — không audit được ai làm gì, không thu hồi riêng lẻ được.
- D sai: cho mọi người dùng root vừa vi phạm "không dùng root hằng ngày" vừa cấp toàn quyền account cho 20 người — cực kỳ nguy hiểm.

📌 Nhớ cho đề: nhiều user cùng quyền → **group + policy**. Thấy "dùng chung user" hay "dùng root cho nhiều người" → luôn sai.

</details>

### Câu 4 (multiple choice)

Việc nào sau đây **bắt buộc** phải dùng root user?

- A. Tạo EC2 instance
- B. Đọc dữ liệu từ S3
- C. Đóng (close) AWS account
- D. Tạo IAM user mới

<details>
<summary>Đáp án</summary>

**C.** Đóng (close) AWS account là một trong số ít tác vụ **chỉ root user mới làm được**.

Root user là danh tính được tạo khi lập account, có toàn quyền tuyệt đối và không thể bị giới hạn bằng policy. AWS khuyến nghị khóa root lại, bật MFA, và không dùng hằng ngày — nhưng có một nhóm nhỏ tác vụ "cấp account" chỉ root mới làm được: đóng account, đổi một số account settings, đổi support plan, một số thao tác billing/thuế.

- A sai: tạo EC2 instance là tác vụ vận hành bình thường, nên làm bằng IAM user/role có quyền phù hợp.
- B sai: đọc dữ liệu từ S3 là tác vụ ứng dụng/người dùng thường ngày, cấp quyền qua policy là đủ.
- D sai: tạo IAM user mới là việc của admin có quyền IAM — không cần và không nên dùng root.

📌 Nhớ cho đề: nhóm việc "chỉ root làm được" = đóng account, đổi support plan, vài tác vụ billing/account settings. Việc vận hành thường ngày thì không bao giờ cần root.

</details>

### Câu 5 (multiple choice)

Biện pháp quan trọng nhất để bảo vệ root user là gì?

- A. Đổi password root mỗi ngày
- B. Bật MFA cho root và không dùng root hằng ngày
- C. Tạo thêm access key cho root
- D. Xóa root user đi

<details>
<summary>Đáp án</summary>

**B.** Bật **MFA** cho root và không dùng root cho việc hằng ngày — đây là khuyến nghị bảo mật số một của AWS cho root.

MFA (Multi-Factor Authentication) thêm một yếu tố thứ hai ngoài password (mã OTP, khóa cứng...), nên kẻ xấu biết password vẫn không đăng nhập được. Vì root có toàn quyền và không giới hạn được bằng policy, nó là mục tiêu nguy hiểm nhất; cách bảo vệ là bật MFA, cất kỹ, và chỉ dùng cho nhóm tác vụ chỉ root mới làm được.

- A sai: đổi password mỗi ngày không phải khuyến nghị thực tế, và một password bị lộ dù mới đổi vẫn nguy hiểm nếu không có MFA — xoay password không thay thế được MFA.
- C sai: tạo access key cho root làm tăng rủi ro — AWS khuyên **không** tạo access key cho root; có key tĩnh của root là thảm họa nếu lộ.
- D sai: không thể xóa root user — nó gắn liền với account suốt vòng đời account.

📌 Nhớ cho đề: bảo vệ root = bật MFA + không dùng hằng ngày + không tạo access key cho root. Không thể xóa root.

</details>

### Câu 6 (multiple choice)

Policy trong IAM được viết ở định dạng nào?

- A. YAML
- B. XML
- C. JSON
- D. CSV

<details>
<summary>Đáp án</summary>

**C.** IAM policy là tài liệu **JSON**.

Một policy mô tả quyền dưới dạng danh sách statement, mỗi statement gồm các trường cốt lõi: `Effect` (Allow hoặc Deny), `Action` (hành động được/không được làm, ví dụ `s3:GetObject`), và `Resource` (tài nguyên áp dụng). JSON cho phép cấu trúc lồng và máy đọc được, nên AWS chọn nó làm định dạng chuẩn cho mọi loại policy.

- A sai: YAML được dùng cho CloudFormation template, không phải cho IAM policy.
- B sai: XML là định dạng cũ, IAM policy không dùng XML.
- D sai: CSV là định dạng bảng phẳng — Credential Report xuất CSV, nhưng policy thì không phải CSV.

📌 Nhớ cho đề: IAM policy = JSON, trục chính là `Effect` / `Action` / `Resource`. Đừng nhầm với YAML của CloudFormation.

</details>

### Câu 7 (multiple choice)

Trong một statement của policy, trường `Effect` nhận giá trị nào?

- A. `Enable` hoặc `Disable`
- B. `Allow` hoặc `Deny`
- C. `Grant` hoặc `Revoke`
- D. `Public` hoặc `Private`

<details>
<summary>Đáp án</summary>

**B.** `Effect` chỉ nhận hai giá trị: `Allow` hoặc `Deny`.

`Effect` là trường quyết định statement đó cho phép hay từ chối hành động mô tả trong `Action`/`Resource`. Vì IAM mặc định đã là từ chối (implicit deny), hầu hết statement dùng `Allow` để mở quyền; `Deny` dùng khi cần chặn tường minh một hành động kể cả khi có Allow khác.

- A sai: `Enable`/`Disable` không phải từ khóa của IAM policy.
- C sai: `Grant`/`Revoke` là khái niệm cấp/thu quyền trong một số hệ CSDL (SQL), không phải giá trị của `Effect`.
- D sai: `Public`/`Private` liên quan tới mức hiển thị tài nguyên (ví dụ S3 bucket), không phải giá trị của `Effect`.

📌 Nhớ cho đề: `Effect` chỉ có `Allow` hoặc `Deny`. Mọi lựa chọn khác là bẫy chữ.

</details>

### Câu 8 (multiple choice)

Một user có một policy `Allow s3:*` và một policy khác `Deny s3:DeleteObject`. User đó có xóa được object trong S3 không?

- A. Có, vì Allow rộng hơn
- B. Không, vì explicit Deny luôn thắng
- C. Tùy thứ tự gắn policy
- D. Chỉ xóa được nếu là root

<details>
<summary>Đáp án</summary>

**B.** Không xóa được — **explicit Deny luôn thắng** mọi Allow, dù Allow có rộng tới đâu.

IAM đánh giá quyền theo quy tắc thứ tự thắng thua cố định: explicit **Deny** > explicit **Allow** > implicit (mặc định) **Deny**. Khi gom tất cả policy áp cho một request, chỉ cần có một statement Deny khớp là request bị từ chối ngay, bất kể bao nhiêu Allow khác. Ở đây `Deny s3:DeleteObject` chặn đúng hành động xóa, nên `Allow s3:*` không cứu được.

- A sai: Allow rộng không thắng được một Deny tường minh — đúng là ngược lại.
- C sai: thứ tự gắn policy không quan trọng; IAM gom toàn bộ policy rồi mới đánh giá, kết quả không phụ thuộc thứ tự.
- D sai: câu hỏi nói về một user có policy, không liên quan root; và root cũng không phải là cách để "lách" một Deny trong tình huống này.

📌 Nhớ cho đề: thứ tự ưu tiên = explicit Deny > explicit Allow > implicit Deny. Có một Deny khớp = chặn, bất kể Allow.

</details>

### Câu 9 (multiple choice)

Một user mới tạo, chưa gắn policy nào, cố gọi một API. Kết quả?

- A. Được phép mọi thứ cho tới khi bị chặn
- B. Bị từ chối, vì mặc định là implicit deny
- C. Được phép đọc nhưng không được ghi
- D. Phải chờ admin phê duyệt từng request

<details>
<summary>Đáp án</summary>

**B.** Bị từ chối — IAM mặc định là **implicit deny**: không có statement Allow nào khớp thì request bị từ chối.

Mọi request trong IAM bắt đầu từ trạng thái bị từ chối. Quyền chỉ có khi có một policy Allow khớp hành động và tài nguyên (và không có Deny nào chặn). User mới chưa gắn policy nào thì chẳng có Allow nào cả, nên mọi API đều bị chặn.

- A sai: IAM không "mở trước, chặn sau" — nó đóng mặc định, phải cấp Allow mới mở.
- C sai: không có quyền đọc mặc định; đọc cũng cần một Allow tương ứng (ví dụ `s3:GetObject`).
- D sai: IAM đánh giá quyền tự động theo policy, không có cơ chế "chờ admin duyệt từng request".

📌 Nhớ cho đề: mặc định = implicit deny. Không Allow khớp → từ chối. Đây là nền tảng để hiểu least privilege.

</details>

### Câu 10 (multiple choice)

Phân biệt nào đúng giữa password và access key?

- A. Password để gọi API/CLI; access key để đăng nhập Console
- B. Password để đăng nhập Console; access key để gọi API/CLI/SDK
- C. Cả hai đều chỉ dùng cho Console
- D. Cả hai đều chỉ dùng cho CLI

<details>
<summary>Đáp án</summary>

**B.** **Password** dùng để đăng nhập AWS Management Console (giao diện web); **access key** (gồm Access Key ID + Secret Access Key) dùng để gọi API/CLI/SDK (truy cập lập trình).

IAM phân biệt hai loại credential cho hai cách truy cập: con người đăng nhập web bằng username + password (kèm MFA nếu bật), còn chương trình/CLI/SDK ký request bằng access key. Hai loại này độc lập — một user có thể có cái này mà không có cái kia.

- A sai: đảo ngược vai trò — password không dùng để gọi API, access key không dùng để đăng nhập Console.
- C sai: access key không dùng cho Console; Console dùng password.
- D sai: password không dùng cho CLI; CLI dùng access key.

📌 Nhớ cho đề: password = Console (người, web), access key = API/CLI/SDK (chương trình). Đừng để bị đảo vai.

</details>

### Câu 11 (multiple choice)

Nguyên tắc "least privilege" nghĩa là gì?

- A. Cấp càng nhiều quyền càng tốt để tránh lỗi thiếu quyền
- B. Chỉ cấp quyền tối thiểu đủ để hoàn thành công việc
- C. Chỉ cấp quyền cho admin
- D. Không cấp quyền cho ai cả

<details>
<summary>Đáp án</summary>

**B.** Least privilege = chỉ cấp **quyền tối thiểu đủ** để hoàn thành công việc, rồi thêm dần khi thực sự cần.

Đây là nguyên tắc bảo mật nền tảng: mỗi danh tính chỉ nên có đúng quyền cần dùng, không hơn. Khi credential bị lộ hoặc bị lạm dụng, quyền càng hẹp thì thiệt hại càng nhỏ. Cách làm đúng là bắt đầu hẹp và mở thêm khi phát sinh nhu cầu, thay vì cấp rộng rồi đi gỡ bớt.

- A sai: cấp càng nhiều càng tốt là ngược hẳn least privilege — nó phóng to bề mặt tấn công và thiệt hại khi lộ.
- C sai: least privilege áp cho mọi danh tính, không riêng admin; và "chỉ cấp cho admin" không mô tả đúng nguyên tắc này.
- D sai: không cấp quyền cho ai thì không ai làm được việc — least privilege là cấp vừa đủ, không phải cấm tiệt.

📌 Nhớ cho đề: least privilege = tối thiểu đủ dùng, mở dần. "Càng nhiều càng tốt" luôn là đáp án sai.

</details>

### Câu 12 (multiple choice)

Bạn muốn một báo cáo liệt kê tất cả IAM user cùng trạng thái MFA, access key và lần dùng cuối để audit. Dùng công cụ nào?

- A. Policy simulator
- B. Credential Report
- C. IAM Access Analyzer
- D. CloudFront

<details>
<summary>Đáp án</summary>

**B.** **Credential Report** — file CSV liệt kê mọi IAM user trong account cùng trạng thái credential: có password không, access key nào, bật MFA chưa, lần dùng cuối là khi nào.

Credential Report là công cụ audit danh tính: bạn tải về một lần, có cái nhìn toàn cảnh để tìm user chưa bật MFA, access key cũ chưa xoay vòng, hay tài khoản không dùng. Đúng với mô tả "báo cáo liệt kê tất cả user cùng trạng thái".

- A sai: Policy simulator dùng để thử xem một policy sẽ cho phép/từ chối một hành động cụ thể, không liệt kê trạng thái credential của user.
- C sai: IAM Access Analyzer tìm tài nguyên bị chia sẻ ra ngoài account (truy cập ngoài ý muốn), không phải báo cáo trạng thái credential từng user.
- D sai: CloudFront là dịch vụ CDN phân phối nội dung, hoàn toàn không liên quan tới IAM.

📌 Nhớ cho đề: audit trạng thái credential của mọi user → **Credential Report** (CSV). Phân biệt với Access Analyzer (truy cập ngoài account).

</details>

### Câu 13 (multiple choice)

Bạn muốn quản lý đăng nhập tập trung cho nhiều AWS account và tích hợp với identity provider doanh nghiệp. Dịch vụ nào phù hợp nhất?

- A. IAM Identity Center (SSO)
- B. Credential Report
- C. Policy simulator
- D. Permission boundaries

<details>
<summary>Đáp án</summary>

**A.** **IAM Identity Center** (trước gọi là AWS SSO) — cho phép đăng nhập tập trung một lần, truy cập nhiều AWS account, và tích hợp với identity provider doanh nghiệp (Active Directory, Okta...).

Khi tổ chức có nhiều account (thường quản lý qua AWS Organizations), tạo IAM user riêng ở từng account là ác mộng. IAM Identity Center giải quyết bằng một điểm đăng nhập chung và một bộ danh tính duy nhất (có thể lấy từ IdP sẵn có của công ty), rồi gán quyền truy cập vào từng account — đúng với cụm "tập trung nhiều account + tích hợp IdP".

- B sai: Credential Report chỉ là báo cáo audit trạng thái credential, không làm đăng nhập tập trung.
- C sai: Policy simulator chỉ thử nghiệm kết quả đánh giá policy, không liên quan quản lý đăng nhập.
- D sai: Permission boundaries là cơ chế đặt trần quyền tối đa cho một danh tính, không phải giải pháp SSO/đa account.

📌 Nhớ cho đề: "đăng nhập tập trung + nhiều account + identity provider" → **IAM Identity Center** (AWS SSO).

</details>

### Câu 14 (multiple choice)

Phát biểu nào đúng về authentication và authorization?

- A. Authentication = được làm gì; authorization = bạn là ai
- B. Authentication = bạn là ai; authorization = được làm gì
- C. Cả hai cùng nghĩa
- D. Authentication chỉ áp cho root

<details>
<summary>Đáp án</summary>

**B.** Authentication = xác minh *bạn là ai*; authorization = quyết định *bạn được làm gì*.

Hai bước này luôn đi liền nhưng khác nhau. Authentication là bước đăng nhập chứng minh danh tính — trong IAM là password + MFA (cho người) hoặc access key / assume role (cho chương trình). Sau khi biết chắc bạn là ai, authorization mới xét policy để quyết định hành động nào được phép. Có danh tính hợp lệ không có nghĩa là có quyền.

- A sai: đảo ngược hai khái niệm — authentication không phải "được làm gì".
- C sai: hai khái niệm khác hẳn nhau; gộp làm một là sai bản chất.
- D sai: authentication áp cho mọi danh tính (user, role...), không riêng root.

📌 Nhớ cho đề: authentication = *bạn là ai* (password/MFA/key); authorization = *được làm gì* (policy). Đừng để bị đảo.

</details>

### Câu 15 (multiple response)

Chọn TẤT CẢ các phát biểu đúng về IAM group. (Chọn 2)

- A. Group có thể chứa nhiều user
- B. Group có credential riêng để đăng nhập Console
- C. Có thể gắn policy vào group và mọi user trong group thừa hưởng
- D. Group có thể lồng trong group khác

<details>
<summary>Đáp án</summary>

**A và C.** Group gom được nhiều user (A), và bạn gắn policy vào group thì mọi user thành viên thừa hưởng quyền đó (C).

IAM group chỉ là một cách gom user để quản lý quyền theo lô — bản thân group không phải là một danh tính có thể đăng nhập. Nó không có credential, không được dùng trong policy như một principal, và không lồng được. Một user có thể thuộc nhiều group và cộng dồn quyền từ tất cả.

- B sai: group **không có credential** riêng — không ai "đăng nhập bằng group"; chỉ user (hoặc role được assume) mới có credential.
- D sai: IAM **không cho lồng group trong group** — cấu trúc group là phẳng, không phân cấp.

📌 Nhớ cho đề: group = gom user + gắn policy để thừa hưởng. Group không có credential, không lồng nhau, không đăng nhập được.

</details>

### Câu 16 (multiple response)

Những cách nào giúp giảm rủi ro lộ hoặc lạm dụng credential? (Chọn 3)

- A. Dùng IAM role với credential tạm thời cho workload thay vì access key tĩnh
- B. Bật MFA cho các user quan trọng
- C. Nhúng access key của admin vào source code để tiện dùng lại
- D. Áp dụng least privilege, chỉ cấp quyền tối thiểu cần thiết

<details>
<summary>Đáp án</summary>

**A, B, D.** Ba cách này đều giảm rủi ro credential theo các hướng bổ sung nhau.

Giảm rủi ro credential đi theo ba trục: giảm credential tĩnh (dùng role lấy credential tạm thời tự xoay vòng — A), tăng lớp bảo vệ khi đăng nhập (MFA thêm yếu tố thứ hai — B), và thu hẹp thiệt hại nếu chẳng may lộ (least privilege khiến credential bị lộ chỉ làm được ít — D). Đây là các best practice cốt lõi của IAM.

- C sai: nhúng access key vào source code là anti-pattern kinh điển — code bị chia sẻ/đẩy lên Git là lộ key ngay, lại là key của admin (quyền rộng) nên thiệt hại tối đa. Đây là cách **làm tăng** rủi ro, không giảm.

📌 Nhớ cho đề: giảm rủi ro credential = role (credential tạm thời) + MFA + least privilege. "Nhúng access key vào code" luôn là đáp án sai.

</details>

## Related Topics

- [IAM — Identity and Access Management](../reference/access-management.md)
- [Mục lục AWS (CLF-C02)](../index.md)
