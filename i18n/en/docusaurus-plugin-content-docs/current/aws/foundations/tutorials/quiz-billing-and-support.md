---
title: "Câu hỏi: Billing & support"
i18n_status: untranslated
sidebar_position: 11
description: "Tự chấm phần quản lý chi phí, Organizations và các gói Support của AWS."
tags: [aws, clf-c02, quiz, billing, support]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

> Tự chấm phần billing, pricing, Organizations và Support. Mỗi câu ghi rõ loại (multiple choice = chọn 1, multiple response = chọn nhiều). Đáp án nằm trong `<details>`.

## Câu 1 (multiple choice)

Bạn muốn **nhận cảnh báo khi chi phí tháng vượt 500 USD**. Dùng công cụ nào?

- A. Cost Explorer
- B. AWS Budgets
- C. Pricing Calculator
- D. Cost and Usage Report

<details>
<summary>Đáp án</summary>

**B. AWS Budgets** — đây là công cụ duy nhất trong nhóm cost management được sinh ra để *đặt ngưỡng và cảnh báo*.

AWS chia các công cụ chi phí theo mục đích rõ rệt: Budgets để *cảnh báo* (đặt ngưỡng cost/usage/RI/SP, gửi alert qua email hoặc SNS khi chạm hoặc khi dự báo sẽ chạm), Cost Explorer để *phân tích*, Pricing Calculator để *ước tính trước*, CUR để *dữ liệu thô chi tiết*. Từ khóa trong đề là "nhận cảnh báo khi vượt" → đây là bài toán của Budgets.

- **A. Cost Explorer** sai: nó trực quan hóa và phân tích chi phí đã phát sinh, có dự báo, nhưng bản thân nó *không* bắn alert theo ngưỡng.
- **C. Pricing Calculator** sai: chỉ dự toán chi phí *trước khi* dùng, không theo dõi chi phí thực tế nên không thể cảnh báo.
- **D. Cost and Usage Report** sai: là file dữ liệu chi phí chi tiết xuất ra S3, phục vụ phân tích sâu — không có cơ chế alert.

📌 Nhớ cho đề: "cảnh báo / ngưỡng / vượt budget" → **AWS Budgets**. "Phân tích / biểu đồ" → Cost Explorer.

</details>

## Câu 2 (multiple choice)

Bạn cần **phân tích xu hướng chi phí trong 6 tháng qua** theo từng dịch vụ, có biểu đồ. Công cụ nào phù hợp nhất?

- A. AWS Budgets
- B. Billing Dashboard
- C. Cost Explorer
- D. Trusted Advisor

<details>
<summary>Đáp án</summary>

**C. Cost Explorer** — công cụ phân tích và trực quan hóa chi phí theo thời gian.

Cost Explorer vẽ biểu đồ chi phí/usage qua các mốc thời gian, cho phép lọc và nhóm theo service, account, tag, region, lại có dự báo xu hướng tương lai. Khi đề nói "xu hướng", "biểu đồ", "phân tích theo dịch vụ qua nhiều tháng" thì đó đúng là mô tả Cost Explorer.

- **A. AWS Budgets** sai: dùng để đặt ngưỡng và cảnh báo, không phải để duyệt và mổ xẻ lịch sử chi phí.
- **B. Billing Dashboard** sai: chỉ là trang tổng quan hóa đơn tháng hiện tại ở mức sơ lược, không có khả năng phân tích xu hướng sâu theo nhiều chiều.
- **D. Trusted Advisor** sai: kiểm tra account theo best practice (gồm nhóm cost optimization), đưa khuyến nghị tiết kiệm — không phải công cụ vẽ biểu đồ xu hướng chi phí.

📌 Nhớ cho đề: muốn *nhìn và mổ xẻ* chi phí đã phát sinh theo thời gian/dịch vụ → **Cost Explorer**.

</details>

## Câu 3 (multiple choice)

Trước khi build một kiến trúc mới, bạn muốn **ước tính chi phí hàng tháng** của nó. Dùng gì?

- A. Cost Explorer
- B. AWS Pricing Calculator
- C. AWS Budgets
- D. Cost Anomaly Detection

<details>
<summary>Đáp án</summary>

**B. AWS Pricing Calculator** — công cụ ước tính chi phí *trước khi* triển khai.

Điểm then chốt phân biệt Pricing Calculator với mọi công cụ còn lại: nó làm việc với chi phí *giả định*, chưa phát sinh. Bạn khai báo cấu hình dự kiến (loại EC2, dung lượng S3, data transfer...) và nó ra con số dự toán hàng tháng, hữu ích cho lập ngân sách và so sánh phương án. Các công cụ còn lại đều chỉ xử lý chi phí *đã* xảy ra.

- **A. Cost Explorer** sai: phân tích chi phí thực tế đã phát sinh, không dự toán cho kiến trúc chưa tồn tại.
- **C. AWS Budgets** sai: đặt ngưỡng/cảnh báo trên chi phí thực tế, không ước tính trước.
- **D. Cost Anomaly Detection** sai: dùng ML phát hiện chi phí bất thường trên dữ liệu thực tế — cũng là hậu kiểm, không phải dự toán.

📌 Nhớ cho đề: "ước tính / dự toán / trước khi dùng / TCO" → **Pricing Calculator**. Mọi công cụ khác đều là *sau khi* chi phí phát sinh.

</details>

## Câu 4 (multiple choice)

Công ty muốn một **Technical Account Manager (TAM)** đồng hành. Gói Support nào đáp ứng?

- A. Developer
- B. Business
- C. Enterprise
- D. Basic

<details>
<summary>Đáp án</summary>

**C. Enterprise** — TAM chỉ xuất hiện ở gói Enterprise (và biến thể Enterprise On-Ramp).

AWS có 4 gói Support: Basic (miễn phí, không có hỗ trợ kỹ thuật), Developer, Business, Enterprise. Mức hỗ trợ tăng dần, và một số đặc quyền chỉ có ở gói cao nhất. TAM là một chuyên gia AWS được chỉ định riêng, đồng hành dài hạn với khách hàng — đây là đặc quyền đắt tiền nhất, nên AWS chỉ gắn nó vào Enterprise.

- **A. Developer** sai: chỉ hỗ trợ qua email/case trong giờ hành chính, không có TAM.
- **B. Business** sai: đã có hỗ trợ 24/7 qua phone/chat và full Trusted Advisor, nhưng *vẫn chưa* có TAM — đây là câu bẫy kinh điển.
- **D. Basic** sai: gói miễn phí, không có hỗ trợ kỹ thuật, đương nhiên không có TAM.

📌 Nhớ cho đề: **TAM = chỉ Enterprise**. Business ≠ TAM dù đã có 24/7.

</details>

## Câu 5 (multiple choice)

Tổ chức có **nhiều AWS account** và muốn **gộp hóa đơn về một chỗ, đồng thời được chiết khấu theo volume**. Giải pháp?

- A. AWS Control Tower
- B. AWS Organizations với consolidated billing
- C. Cost Allocation Tags
- D. IAM groups

<details>
<summary>Đáp án</summary>

**B. AWS Organizations với consolidated billing** — gộp hóa đơn và cộng gộp usage để hưởng chiết khấu volume.

Organizations cho phép quản lý tập trung nhiều account. Tính năng consolidated billing đẩy toàn bộ hóa đơn của các member account về management (payer) account, và quan trọng hơn: nó *cộng gộp usage* của tất cả account lại. Nhờ cộng gộp, tổng usage chạm các mốc chiết khấu theo tier sớm hơn so với khi từng account trả riêng lẻ.

- **A. AWS Control Tower** sai: dùng để *dựng sẵn* môi trường multi-account chuẩn (landing zone), không phải cơ chế gộp hóa đơn và chiết khấu — tuy nó chạy trên nền Organizations.
- **C. Cost Allocation Tags** sai: chỉ gắn nhãn để *phân bổ/báo cáo* chi phí theo dự án/phòng ban, không gộp hóa đơn cũng không tạo chiết khấu.
- **D. IAM groups** sai: nhóm user để quản lý quyền, hoàn toàn không liên quan tới billing.

📌 Nhớ cho đề: chiết khấu đến từ *gộp usage*, không phải từ việc có nhiều account. "Gộp hóa đơn + chiết khấu volume" → **Organizations + consolidated billing**.

</details>

## Câu 6 (multiple choice)

Bạn muốn **đặt trần quyền tối đa** mà một account con trong Organizations được phép sử dụng, bất kể IAM cấp gì. Dùng gì?

- A. IAM policy
- B. Service Control Policy (SCP)
- C. Resource policy
- D. Security group

<details>
<summary>Đáp án</summary>

**B. Service Control Policy (SCP)** — đặt *trần* quyền tối đa ở mức account hoặc OU.

Điểm cốt lõi phải thuộc lòng: **SCP không cấp quyền, nó chỉ giới hạn**. Nó định nghĩa ranh giới (permission boundary) cho toàn bộ account/OU — quyền thực tế của một principal là *phần giao* giữa cái SCP cho phép và cái IAM cấp. Dù IAM policy có mở rộng tới đâu, nếu SCP chặn thì hành động vẫn bị từ chối.

- **A. IAM policy** sai: IAM *cấp* quyền cho user/role, không đặt trần cho cả account. Nếu chỉ dựa vào IAM, một admin trong account con vẫn có thể tự nới quyền.
- **C. Resource policy** sai: gắn vào từng resource (vd bucket policy của S3) để kiểm soát ai truy cập resource đó, không phải trần quyền cho cả account.
- **D. Security group** sai: đây là firewall ảo mức network cho EC2/ENI, lọc traffic in/out — không liên quan tới quyền IAM.

📌 Nhớ cho đề: **SCP = guardrail, chỉ giới hạn chứ không cấp**. Quyền hiệu lực = IAM ∩ SCP.

</details>

## Câu 7 (multiple choice)

Công cụ nào **tự động kiểm tra account theo best practice** của AWS về bảo mật, chi phí, hiệu năng, fault tolerance và service limits?

- A. AWS Config
- B. Trusted Advisor
- C. CloudTrail
- D. Compute Optimizer

<details>
<summary>Đáp án</summary>

**B. Trusted Advisor** — quét account và đưa khuyến nghị theo best practice của AWS.

Trusted Advisor chạy các check tự động và chấm theo 5 nhóm (pillar): **Cost Optimization, Performance, Security, Fault Tolerance, Service Limits/Quotas**. Nhận ra đúng 5 nhóm này là cách khóa đáp án nhanh nhất cho đề. Lưu ý: tài khoản Basic/Developer chỉ thấy một tập check giới hạn; full checks từ Business trở lên.

- **A. AWS Config** sai: theo dõi và ghi lại *cấu hình* resource theo thời gian, đánh giá tuân thủ (compliance) theo rule do bạn định nghĩa — không phải bộ khuyến nghị best practice 5 nhóm của AWS.
- **C. CloudTrail** sai: ghi log *ai làm gì* (API calls) phục vụ audit, không chấm best practice.
- **D. Compute Optimizer** sai: chỉ khuyến nghị rightsizing cho một số resource (EC2, EBS, Lambda...), phạm vi hẹp hơn nhiều và không bao 5 nhóm.

📌 Nhớ cho đề: "best practice + 5 nhóm (cost, performance, security, fault tolerance, service limits)" → **Trusted Advisor**.

</details>

## Câu 8 (multiple choice)

Phát biểu nào về **Free Tier** là **đúng**?

- A. Mọi dịch vụ đều miễn phí trong 12 tháng đầu
- B. Free Tier gồm ba loại: always free, 12 tháng, và trial
- C. Free Tier chỉ áp dụng cho EC2
- D. Hết Free Tier thì account tự động bị khóa

<details>
<summary>Đáp án</summary>

**B** — Free Tier có đúng ba loại: always free, 12 tháng, và trial.

Ba loại đó là: **always free** (luôn miễn phí trong một hạn mức cố định, vd một lượng request Lambda mỗi tháng), **12 tháng** (miễn phí trong 12 tháng đầu kể từ khi mở account, vd một lượng giờ EC2 t2/t3.micro), và **trial** (dùng thử ngắn hạn cho vài dịch vụ cụ thể). Hết hạn mức hoặc hết thời hạn thì chi phí tính theo giá thường.

- **A** sai: không phải mọi dịch vụ, và không phải loại nào cũng theo khung 12 tháng — nhiều thứ thuộc always free hoặc chẳng có Free Tier.
- **C** sai: Free Tier trải trên rất nhiều dịch vụ (Lambda, S3, DynamoDB, RDS...), không riêng EC2.
- **D** sai: AWS không khóa account khi hết Free Tier, nó chỉ bắt đầu tính tiền phần vượt hạn mức như bình thường.

📌 Nhớ cho đề: ba loại Free Tier = **always free / 12 tháng / trial**; hết hạn thì *tính tiền*, không khóa account.

</details>

## Câu 9 (multiple choice)

Bạn cần **báo cáo chi phí chi tiết nhất**, từng dòng usage, xuất ra S3 để phân tích sâu bằng Athena. Dùng gì?

- A. Billing Dashboard
- B. Cost Explorer
- C. Cost and Usage Report (CUR)
- D. AWS Budgets

<details>
<summary>Đáp án</summary>

**C. Cost and Usage Report (CUR)** — nguồn dữ liệu chi phí chi tiết nhất, xuất thẳng ra S3.

CUR là file (CSV/Parquet) liệt kê chi phí và usage ở mức chi tiết nhất mà AWS cung cấp — tới từng dòng line item theo giờ/ngày, kèm đầy đủ metadata và tag. Vì đổ vào S3 nên nó là nguồn lý tưởng để query bằng Athena hoặc nạp vào data warehouse. Từ khóa "chi tiết nhất", "từng dòng", "xuất ra S3", "Athena" đều trỏ thẳng về CUR.

- **A. Billing Dashboard** sai: chỉ là trang tổng quan sơ lược, không có dữ liệu chi tiết tới line item.
- **B. Cost Explorer** sai: trực quan và linh hoạt nhưng dữ liệu đã được tổng hợp (aggregate), không xuống tới từng dòng usage như CUR; cũng không phải dạng file đổ vào S3 cho Athena.
- **D. AWS Budgets** sai: chỉ đặt ngưỡng và cảnh báo, không sinh báo cáo chi tiết.

📌 Nhớ cho đề: "chi tiết nhất / từng dòng / S3 / Athena" → **CUR**. Cần nhìn nhanh có biểu đồ → Cost Explorer.

</details>

## Câu 10 (multiple choice)

Theo nguyên tắc giá của AWS, chi phí **data transfer** thường phát sinh ở chiều nào?

- A. Dữ liệu đi vào AWS (IN)
- B. Dữ liệu đi ra Internet/ra region khác (OUT)
- C. Cả IN và OUT đều tính như nhau
- D. Data transfer luôn miễn phí

<details>
<summary>Đáp án</summary>

**B. Data transfer OUT** — dữ liệu đi *ra* mới là phần tốn tiền.

Một trong các nguyên tắc giá nền của AWS: pay-as-you-go, trả cho những gì dùng, và với data transfer thì chiều ra Internet (hoặc sang region khác) mới tính phí. Lý do kinh tế: AWS khuyến khích đưa dữ liệu *vào* hệ sinh thái của họ (IN thường miễn phí) nhưng tính phí khi dữ liệu rời đi. Đây là cạm bẫy chi phí phổ biến với ứng dụng serve nhiều dữ liệu ra ngoài.

- **A. IN** sai: dữ liệu đi vào AWS thường miễn phí, đúng ngược lại với vế được tính phí.
- **C** sai: IN và OUT *không* tính như nhau — IN hầu như free còn OUT mới tốn tiền.
- **D** sai: data transfer không phải lúc nào cũng miễn phí; OUT ra Internet/region khác có phí.

📌 Nhớ cho đề: **IN thường free, OUT ra Internet/region khác tốn tiền**. Data transfer là bẫy chi phí hay quên.

</details>

## Câu 11 (multiple choice)

Bạn muốn **dựng nhanh một môi trường multi-account** với OU, guardrails, logging theo best practice ngay từ đầu. Dịch vụ nào?

- A. AWS Organizations (tự cấu hình thủ công)
- B. AWS Control Tower
- C. AWS Config
- D. IAM Identity Center

<details>
<summary>Đáp án</summary>

**B. AWS Control Tower** — dựng sẵn một landing zone multi-account theo chuẩn, ngay từ đầu.

Control Tower đóng vai trò "orchestrator": nó tự thiết lập Organizations, tạo OU mẫu, bật guardrails (các SCP và check tuân thủ dựng sẵn), cấu hình logging tập trung và SSO — tất cả theo best practice, chỉ với vài click thay vì ghép tay từng mảnh. Từ khóa "dựng nhanh / ngay từ đầu / theo best practice / landing zone" là dấu hiệu của Control Tower.

- **A. AWS Organizations (thủ công)** sai: là nền tảng bên dưới và *có* làm được multi-account, nhưng bạn phải tự cấu hình từng OU, từng SCP, từng pipeline logging — ngược với "dựng nhanh sẵn best practice".
- **C. AWS Config** sai: theo dõi và đánh giá cấu hình resource, chỉ là một mảnh trong bức tranh governance, không dựng cả landing zone.
- **D. IAM Identity Center** sai: lo phần SSO/quản lý truy cập tập trung, cũng chỉ là một thành phần, không tạo toàn bộ môi trường multi-account.

📌 Nhớ cho đề: "landing zone / dựng nhanh multi-account sẵn guardrails" → **Control Tower** (chạy trên nền Organizations).

</details>

## Câu 12 (multiple choice)

Gói Support nào **bắt đầu có hỗ trợ kỹ thuật 24/7 qua phone/chat**?

- A. Basic
- B. Developer
- C. Business
- D. Chỉ Enterprise

<details>
<summary>Đáp án</summary>

**C. Business** — 24/7 phone/chat bắt đầu có từ gói Business trở lên.

Thang hỗ trợ kỹ thuật theo 4 gói: Basic không có hỗ trợ kỹ thuật; Developer có hỗ trợ qua email/case trong giờ hành chính; **Business** nâng lên 24/7 qua phone, chat và email cùng full Trusted Advisor; Enterprise giữ mọi thứ của Business và thêm TAM cùng response time nhanh nhất. "Bắt đầu có 24/7" nghĩa là tìm gói *thấp nhất* có đặc quyền đó → Business.

- **A. Basic** sai: gói miễn phí, không có hỗ trợ kỹ thuật nào.
- **B. Developer** sai: chỉ hỗ trợ qua email trong giờ hành chính, chưa có 24/7 qua phone/chat.
- **D. Chỉ Enterprise** sai: Enterprise đương nhiên có 24/7 nhưng *không phải* nơi bắt đầu — Business đã có rồi.

📌 Nhớ cho đề: **24/7 phone/chat bắt đầu từ Business**. TAM mới là thứ bắt đầu (và chỉ có) ở Enterprise.

</details>

## Câu 13 (multiple response — chọn 2)

Những phát biểu nào về **consolidated billing** trong AWS Organizations là **đúng**? (Chọn 2)

- A. Gộp hóa đơn của mọi account về một chỗ
- B. Cộng gộp usage để được chiết khấu theo volume
- C. Tự động cấp thêm quyền IAM cho account con
- D. Thay thế hoàn toàn nhu cầu dùng IAM

<details>
<summary>Đáp án</summary>

**A và B** — đây đúng là hai tác dụng cốt lõi của consolidated billing.

Consolidated billing làm hai việc về *tiền*: dồn toàn bộ hóa đơn các member account về management account để trả một lần (A), và cộng gộp usage của tất cả account lại nên tổng chạm mốc chiết khấu theo tier sớm hơn (B). Mấu chốt cần tách bạch: đây thuần túy là chuyện billing, hoàn toàn độc lập với chuyện quyền (permissions).

- **C** sai: billing không liên quan gì tới việc cấp quyền; quyền trong account con vẫn do IAM (và bị SCP giới hạn) quyết định.
- **D** sai: Organizations/consolidated billing *không* thay thế IAM. IAM vẫn là nơi cấp quyền cho từng user/role trong mỗi account.

📌 Nhớ cho đề: consolidated billing = **gộp hóa đơn + gộp usage để chiết khấu**. Nó không đụng tới permissions, không thay IAM.

</details>

## Câu 14 (multiple response — chọn 2)

Hai tính năng nào **chỉ** (hoặc bắt đầu) có ở các gói cao hơn? (Chọn 2)

- A. Technical Account Manager — chỉ Enterprise
- B. Full Trusted Advisor checks — từ Business trở lên
- C. AWS Health Dashboard — chỉ Enterprise
- D. Truy cập documentation — chỉ Business

<details>
<summary>Đáp án</summary>

**A và B** — đây là hai đặc quyền thực sự bị khóa theo gói.

Hai mốc kinh điển cần thuộc: TAM là độc quyền của Enterprise (A đúng), còn full Trusted Advisor checks mở từ Business trở lên (B đúng — Basic/Developer chỉ thấy tập check giới hạn). Để loại C và D, nhớ nguyên tắc: những thứ *ai cũng cần để vận hành cơ bản* thì AWS cho miễn phí với mọi account.

- **C** sai: AWS Health Dashboard (service health + your account health) có cho *mọi* account, kể cả Basic — không phải đặc quyền Enterprise.
- **D** sai: documentation, whitepapers, forum... đều miễn phí và mở cho tất cả; không bị khóa sau gói Business.

📌 Nhớ cho đề: bị khóa theo gói = **TAM (chỉ Enterprise)** và **full Trusted Advisor (từ Business)**. Health Dashboard và docs thì ai cũng có.

</details>

## Câu 15 (multiple choice)

Công cụ nào dùng **machine learning để phát hiện chi phí bất thường** và cảnh báo?

- A. Cost Anomaly Detection
- B. Cost Explorer
- C. Trusted Advisor
- D. Compute Optimizer

<details>
<summary>Đáp án</summary>

**A. Cost Anomaly Detection** — dùng ML học pattern chi tiêu và báo khi lệch bất thường.

Điểm phân biệt: đây không phải cảnh báo theo *ngưỡng cố định* (việc đó là của Budgets), mà là ML tự học hành vi chi phí bình thường của bạn rồi phát hiện các đột biến bất thường và gửi alert. Từ khóa "machine learning + bất thường + cảnh báo" khóa thẳng đáp án.

- **B. Cost Explorer** sai: phân tích và trực quan hóa chi phí, có dự báo, nhưng không chuyên phát hiện anomaly bằng ML và tự cảnh báo.
- **C. Trusted Advisor** sai: khuyến nghị best practice theo 5 nhóm (gồm cost optimization), không phải phát hiện chi phí bất thường theo thời gian thực.
- **D. Compute Optimizer** sai: dùng ML nhưng cho mục đích *rightsizing* resource (đề xuất loại EC2/EBS/Lambda phù hợp), không phải phát hiện anomaly chi phí.

📌 Nhớ cho đề: "ML + chi phí bất thường" → **Cost Anomaly Detection**. "Ngưỡng cố định" → Budgets. "Rightsizing" → Compute Optimizer.

</details>

## Câu 16 (multiple choice)

Bạn muốn biết **AWS có đang gặp sự cố ở region nào không, và có sự kiện nào ảnh hưởng trực tiếp tới resource của account mình không**. Xem ở đâu?

- A. CloudWatch
- B. AWS Health Dashboard
- C. Trusted Advisor
- D. CloudTrail

<details>
<summary>Đáp án</summary>

**B. AWS Health Dashboard** — nơi xem tình trạng dịch vụ AWS và các sự kiện ảnh hưởng tới account của bạn.

Health Dashboard có hai phần: **service health** cho trạng thái chung của các dịch vụ AWS theo region (có sự cố toàn cục không), và **your account health** (trước đây là Personal Health Dashboard) cho các sự kiện ảnh hưởng *trực tiếp* tới chính resource của account bạn — vd một bảo trì theo lịch hay sự cố chạm đúng instance của bạn. Đề hỏi cả hai khía cạnh đó nên trỏ thẳng về Health Dashboard.

- **A. CloudWatch** sai: giám sát metric, log và đặt alarm cho *resource của bạn*, không phản ánh tình trạng hạ tầng/sự cố phía AWS.
- **C. Trusted Advisor** sai: khuyến nghị best practice, không báo tình trạng sự cố dịch vụ theo thời gian thực.
- **D. CloudTrail** sai: ghi log API ai-làm-gì để audit, không liên quan tới health của dịch vụ AWS.

📌 Nhớ cho đề: "AWS có sự cố không / sự kiện ảnh hưởng tới account mình" → **AWS Health Dashboard**. Giám sát resource của chính mình → CloudWatch.

</details>

## Related Topics

- [Billing, pricing & support](../reference/billing-and-cost-management.md)
- [Mục lục AWS](../index.md)
