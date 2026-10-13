---
title: "Câu hỏi: Khái niệm cloud & global infrastructure"
sidebar_position: 1
description: "Tự chấm phần khái niệm cloud, deployment model và global infrastructure cho CLF-C02."
tags: [aws, clf-c02, quiz, cloud-concepts]
domain: cloud
category: concept
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-13
---

> Tự chấm: đọc đề, chọn đáp án, rồi mở khối **Đáp án** để đối chiếu. Mỗi câu ghi rõ loại.

## Câu 1 (multiple choice — chọn 1)

Một startup không muốn bỏ tiền mua server trước, mà chỉ trả cho phần hạ tầng thực sự dùng mỗi tháng. Lợi ích nào của cloud mô tả điều này?

- A. Economies of scale
- B. Trade capital expense for variable expense
- C. Go global in minutes
- D. Increase speed and agility

<details>
<summary>Đáp án</summary>

**B.** Đây đúng là định nghĩa của "trade capital expense for variable expense": thay vì bỏ một khoản lớn mua server trước (capital expense — capex), bạn chỉ trả cho đúng phần hạ tầng đã tiêu thụ (variable expense — opex).

Sáu lợi ích của cloud trong khung AWS mỗi cái nhắm vào một nỗi đau khác nhau của hạ tầng truyền thống. Cái này nhắm vào *dòng tiền*: không phải đoán trước rồi chôn vốn vào phần cứng ngồi chơi, mà trả theo mức dùng — dùng nhiều trả nhiều, dùng ít trả ít. Dấu hiệu nhận ra là bài toán nói về *tiền trả trước* so với *tiền trả theo tháng/theo mức dùng*.

- A. Economies of scale nói về việc AWS mua/vận hành ở quy mô khổng lồ nên chi phí đơn vị thấp và truyền lại giá thấp — đó là lý do giá *rẻ*, không phải việc *đổi hình thức chi phí* từ trả trước sang trả theo dùng.
- C. Go global in minutes nói về việc triển khai ứng dụng ra nhiều Region trên thế giới chỉ trong vài phút — chuyện về *phạm vi địa lý*, không liên quan tới cách trả tiền.
- D. Increase speed and agility nói về việc có tài nguyên trong vài phút nên thử nghiệm/ra sản phẩm nhanh — chuyện về *tốc độ*, không phải về mô hình chi phí.

📌 Nhớ cho đề: đề nhắc "không mua trước / chỉ trả cho phần dùng" → **trade capex for opex (variable expense)**. Đừng nhầm với economies of scale (vì sao *rẻ*).

</details>

## Câu 2 (multiple choice — chọn 1)

Để đạt **high availability**, nên triển khai ứng dụng trên nhiều thành phần nào trong cùng một Region?

- A. Nhiều Edge Location
- B. Nhiều Region
- C. Nhiều Availability Zone
- D. Nhiều Local Zone

<details>
<summary>Đáp án</summary>

**C.** High availability *trong một Region* đạt được bằng cách trải workload qua nhiều Availability Zone (AZ). Mỗi AZ là một hoặc nhiều data center tách biệt về nguồn điện, làm mát, vị trí vật lý; nếu một AZ sập thì các AZ còn lại vẫn phục vụ.

Đây là nguyên tắc thiết kế nền tảng của AWS: kiến trúc nhiều AZ (Multi-AZ) là cách chuẩn để chịu lỗi ở mức hạ tầng mà vẫn ở trong cùng một Region (độ trễ giữa các AZ rất thấp, dữ liệu vẫn nằm trong cùng khu vực địa lý). Đề khóa bằng cụm từ "trong cùng một Region" chính là để loại các lựa chọn vượt ra ngoài một Region.

- A. Edge Location phục vụ phân phối nội dung (CDN/CloudFront) cho người dùng cuối, không phải nơi chạy và nhân bản ứng dụng để chịu lỗi.
- B. Nhiều Region cho khả năng chịu thảm họa (disaster recovery) ở quy mô địa lý lớn, nhưng đề đã ràng buộc "trong cùng một Region" nên loại.
- D. Local Zone là phần mở rộng của Region đặt gần các thành phố lớn để giảm độ trễ cho một số workload, không phải cơ chế tiêu chuẩn để đạt high availability.

📌 Nhớ cho đề: "high availability + trong một Region" → **Multiple Availability Zones**. "Multiple Regions" là disaster recovery, không phải HA trong Region.

</details>

## Câu 3 (multiple choice — chọn 1)

Một trang web muốn giảm độ trễ khi phân phối nội dung (ảnh, video) cho người dùng trên toàn cầu. Thành phần hạ tầng nào phục vụ mục đích này?

- A. Availability Zone
- B. Region
- C. Edge Location
- D. AWS Outposts

<details>
<summary>Đáp án</summary>

**C.** Edge Location (Point of Presence) là các điểm phân bố rộng khắp, nằm gần người dùng cuối, dùng để cache và phục vụ nội dung tĩnh/động qua CDN Amazon CloudFront. Người dùng lấy nội dung từ điểm gần họ nhất thay vì đi vòng về Region gốc → độ trễ thấp hơn.

Khác biệt cốt lõi cần nắm: Region/AZ là *nơi chạy và lưu* workload; Edge Location là *nơi phân phối* nội dung ra gần người dùng. Đề nào nhắc tới "giảm latency khi phân phối nội dung cho người dùng toàn cầu" gần như luôn nhắm tới Edge Location/CloudFront.

- A. Availability Zone là nơi đặt data center để chạy/lưu workload trong một Region — không phải điểm phân phối nội dung gần người dùng.
- B. Region là cụm hạ tầng ở một khu vực địa lý, cũng là nơi chạy/lưu, số lượng ít và nằm xa phần lớn người dùng; dùng trực tiếp Region sẽ latency cao hơn Edge.
- D. AWS Outposts đưa hạ tầng AWS vào data center của chính khách hàng cho nhu cầu hybrid/độ trễ nội bộ — không liên quan tới phân phối nội dung ra công chúng toàn cầu.

📌 Nhớ cho đề: "content delivery / low latency / toàn cầu / CDN" → **Edge Location + CloudFront**.

</details>

## Câu 4 (multiple choice — chọn 1)

Amazon EC2 thuộc mô hình dịch vụ nào?

- A. SaaS
- B. PaaS
- C. IaaS
- D. FaaS

<details>
<summary>Đáp án</summary>

**C.** Amazon EC2 cung cấp máy chủ ảo (virtual machine) mà *bạn tự quản* hệ điều hành, patch, runtime, middleware và ứng dụng — AWS chỉ lo phần hạ tầng vật lý bên dưới (máy chủ, mạng, ảo hóa). Đó đúng là Infrastructure as a Service (IaaS).

Cách phân biệt ba tầng theo "ai quản cái gì": IaaS bạn quản nhiều nhất (từ OS trở lên); PaaS nhà cung cấp lo cả OS/runtime, bạn chỉ lo code + dữ liệu; SaaS bạn chỉ dùng phần mềm, không quản gì bên dưới. EC2 nằm ở đầu "bạn quản nhiều nhất".

- A. SaaS là phần mềm dùng ngay (ví dụ email qua trình duyệt), người dùng không chạm tới OS hay server — khác hẳn EC2.
- B. PaaS lo sẵn nền tảng để bạn chỉ đẩy code (ví dụ Elastic Beanstalk), bạn không tự vá OS như với EC2.
- D. FaaS (như AWS Lambda) chạy theo hàm/sự kiện, không có server để bạn quản — không phải mô hình của EC2. (FaaS thường được xếp là một dạng serverless chứ không thuộc ba tầng kinh điển IaaS/PaaS/SaaS.)

📌 Nhớ cho đề: "virtual machine / tự quản OS" → **IaaS**. EC2, VPC, EBS đều là IaaS.

</details>

## Câu 5 (multiple choice — chọn 1)

Công ty giữ một phần hệ thống trong data center riêng vì lý do tuân thủ, đồng thời chạy phần còn lại trên AWS và nối hai bên với nhau. Đây là deployment model nào?

- A. Public / cloud-native
- B. Hybrid
- C. On-premises
- D. Multi-Region

<details>
<summary>Đáp án</summary>

**B.** Hybrid là mô hình triển khai kết hợp *cloud* và *on-premises*, nối hai môi trường với nhau để chạy workload trên cả hai. Đây đúng là kịch bản giữ một phần tại chỗ (vì tuân thủ, độ trễ, hoặc đầu tư cũ) nhưng vẫn tận dụng AWS cho phần còn lại.

Ba deployment model của CLF-C02: cloud (toàn bộ trên cloud), on-premises/private (toàn bộ tại chỗ), và hybrid (kết hợp, có kết nối giữa hai bên). Dấu hiệu nhận ra hybrid là từ "đồng thời", "nối hai bên", "một phần tại chỗ một phần trên cloud".

- A. Public / cloud-native nghĩa là toàn bộ chạy trên cloud, không giữ phần nào ở data center riêng — trái với đề.
- C. On-premises nghĩa là toàn bộ chạy tại chỗ, không có phần nào trên AWS — cũng trái với đề.
- D. Multi-Region không phải một deployment model mà là một chiến lược phân bố workload qua nhiều Region (cho HA/DR) — không mô tả quan hệ cloud ↔ tại chỗ.

📌 Nhớ cho đề: "một phần tại chỗ + một phần trên cloud + nối với nhau" → **Hybrid**.

</details>

## Câu 6 (multiple choice — chọn 1)

Một ứng dụng phải lưu dữ liệu công dân trong lãnh thổ một quốc gia theo quy định pháp luật. Yếu tố nào quan trọng nhất khi chọn nơi chạy?

- A. Pricing của Region
- B. Số lượng Availability Zone
- C. Compliance / data sovereignty của Region
- D. Số Edge Location gần đó

<details>
<summary>Đáp án</summary>

**C.** Khi luật pháp bắt buộc dữ liệu phải nằm trong một khu vực địa lý nhất định (data sovereignty / data residency), yếu tố compliance là ràng buộc *loại trừ đầu tiên*: chỉ những Region nằm trong lãnh thổ hợp lệ mới được xét, mọi yếu tố khác (giá, latency) chỉ cân nhắc *sau* khi đã lọc theo compliance.

Khi chọn Region, có bốn yếu tố chuẩn: compliance/data sovereignty, latency tới người dùng, pricing, và service availability. Mấu chốt là thứ tự ưu tiên thay đổi theo bài toán; ở đây đề nhấn "theo quy định pháp luật" nên compliance thắng tuyệt đối.

- A. Pricing là yếu tố cần cân nhắc, nhưng không bao giờ vượt qua ràng buộc pháp lý — chọn Region rẻ mà vi phạm luật là loại ngay.
- B. Số lượng AZ liên quan tới high availability chứ không quyết định dữ liệu được phép nằm ở đâu.
- D. Số Edge Location liên quan tới latency phân phối nội dung, không phải ràng buộc lưu trữ dữ liệu theo luật.

📌 Nhớ cho đề: "luật bắt dữ liệu nằm trong lãnh thổ" → **Compliance / data sovereignty** là yếu tố hàng đầu khi chọn Region.

</details>

## Câu 7 (multiple response — chọn 2)

Đâu là **hai** đặc trưng cốt lõi của cloud computing ở mức khái niệm? (Chọn 2)

- A. On-demand self-service
- B. Bắt buộc ký hợp đồng 3 năm
- C. Pay-as-you-go
- D. Chỉ chạy được trên phần cứng tại chỗ

<details>
<summary>Đáp án</summary>

**A và C.** Cloud computing được định nghĩa bởi khả năng tự cấp phát tài nguyên theo nhu cầu, tức thì, không cần con người ở phía nhà cung cấp can thiệp (on-demand self-service), và trả tiền theo đúng mức tiêu thụ (pay-as-you-go). Hai đặc trưng này đi đôi: bạn bật tài nguyên khi cần và chỉ trả cho thời gian/dung lượng đã dùng.

Về bản chất, cloud là tài nguyên *co giãn* và *lấy ngay* qua phần mềm/API — khác hoàn toàn với mô hình mua trước, cam kết dài hạn và bị ràng vào phần cứng cố định.

- B. Bắt buộc ký hợp đồng 3 năm là ràng buộc dài hạn kiểu truyền thống — ngược với tinh thần pay-as-you-go và linh hoạt của cloud. (Lưu ý: AWS *có* tùy chọn cam kết như Reserved Instances/Savings Plans để tiết kiệm, nhưng đó là tùy chọn, không phải *bắt buộc* — nên B vẫn sai.)
- D. "Chỉ chạy được trên phần cứng tại chỗ" đúng là mô hình on-premises, phủ nhận bản chất truy cập qua mạng/API của cloud — sai.

📌 Nhớ cho đề: đặc trưng cloud = **on-demand self-service + pay-as-you-go** (elastic, broad network access). Thấy "bắt buộc cam kết dài hạn" hoặc "chỉ phần cứng tại chỗ" là distractor.

</details>

## Câu 8 (multiple choice — chọn 1)

Dịch vụ nào là ví dụ điển hình của **PaaS** trên AWS?

- A. Amazon EC2
- B. AWS Elastic Beanstalk
- C. Amazon VPC
- D. Amazon EBS

<details>
<summary>Đáp án</summary>

**B.** AWS Elastic Beanstalk là ví dụ kinh điển của Platform as a Service: bạn chỉ đẩy code ứng dụng lên, còn AWS tự lo provisioning máy chủ, cài OS, patching, load balancing và scaling nền tảng bên dưới. Bạn tập trung vào ứng dụng, không quản hạ tầng.

Ranh giới PaaS vs IaaS nằm ở *ai vá OS và dựng nền tảng*: PaaS nhà cung cấp lo, IaaS bạn tự lo. Cả ba lựa chọn còn lại đều là các khối hạ tầng mà bạn tự lắp ráp và quản — tức IaaS.

- A. Amazon EC2 là máy chủ ảo bạn tự quản OS/patch → IaaS, không phải PaaS.
- C. Amazon VPC là mạng ảo bạn tự thiết kế subnet/route/security → thành phần hạ tầng mạng (IaaS), không phải nền tảng chạy code.
- D. Amazon EBS là ổ đĩa khối gắn vào EC2 → thành phần lưu trữ hạ tầng (IaaS), không phải PaaS.

📌 Nhớ cho đề: "chỉ đẩy code, AWS lo platform" → **PaaS (Elastic Beanstalk)**. EC2/VPC/EBS = IaaS.

</details>

## Câu 9 (multiple choice — chọn 1)

Một doanh nghiệp muốn đưa phần cứng và dịch vụ AWS vào **chính data center của họ** để đạt độ trễ thấp và giữ dữ liệu tại chỗ. Giải pháp nào phù hợp?

- A. AWS Wavelength
- B. Amazon CloudFront
- C. AWS Outposts
- D. AWS Local Zones

<details>
<summary>Đáp án</summary>

**C.** AWS Outposts đưa phần cứng do AWS quản và một tập dịch vụ AWS vào *chính data center/cơ sở của khách hàng*. Nó dùng cho hybrid khi cần độ trễ rất thấp tới hệ thống nội bộ, hoặc khi dữ liệu buộc phải nằm tại chỗ nhưng vẫn muốn API/trải nghiệm giống AWS.

Nhóm "hạ tầng mở rộng của AWS" dễ nhầm lẫn, phân biệt theo *chạy ở đâu*: Outposts = tại cơ sở khách hàng; Local Zones = gần thành phố lớn (do AWS vận hành); Wavelength = trong mạng 5G của nhà mạng; Edge/CloudFront = điểm CDN gần người dùng. Đề khóa bằng "chính data center của họ" → Outposts.

- A. AWS Wavelength nhúng compute/storage vào mạng 5G của nhà mạng cho ứng dụng mobile/edge — không đặt trong data center riêng của doanh nghiệp.
- B. Amazon CloudFront là CDN phân phối nội dung qua Edge Location — không phải đưa hạ tầng vào cơ sở khách hàng.
- D. AWS Local Zones đặt tài nguyên gần các khu đô thị lớn (do AWS quản, không nằm trong cơ sở của khách hàng) để giảm latency cho một số workload.

📌 Nhớ cho đề: "đưa hạ tầng AWS vào data center của chính khách hàng / on-premises + low latency nội bộ" → **AWS Outposts**.

</details>

## Câu 10 (multiple choice — chọn 1)

Vì sao AWS có thể cung cấp giá thấp hơn so với tự dựng hạ tầng?

- A. Vì AWS không tính phí lưu trữ
- B. Vì economies of scale — mua và vận hành ở quy mô khổng lồ
- C. Vì mọi dịch vụ đều miễn phí trong năm đầu
- D. Vì khách hàng phải đoán capacity trước

<details>
<summary>Đáp án</summary>

**B.** Economies of scale: vì hàng trăm nghìn khách hàng dùng chung hạ tầng khổng lồ của AWS, chi phí mua sắm và vận hành *trên mỗi đơn vị* (mỗi giờ compute, mỗi GB lưu trữ) giảm xuống; phần tiết kiệm đó được truyền lại thành giá thấp hơn cho khách hàng. Đây là lý do về *giá rẻ hơn*.

Đừng nhầm economies of scale (vì sao *rẻ*) với trade capex for opex (đổi *hình thức* chi phí) — cả hai đều là lợi ích tài chính của cloud nhưng trả lời câu hỏi khác nhau.

- A. "Không tính phí lưu trữ" là sai sự thật — lưu trữ trên AWS có tính phí; đây không phải lý do giá thấp.
- C. "Mọi dịch vụ miễn phí năm đầu" là sai — AWS Free Tier chỉ bao một phần dịch vụ ở mức giới hạn, không phải tất cả và không phải miễn phí hoàn toàn.
- D. "Khách hàng phải đoán capacity trước" là nhược điểm của hạ tầng truyền thống; cloud loại bỏ việc đoán capacity, nên đây không thể là lý do cloud rẻ hơn.

📌 Nhớ cho đề: "vì sao AWS rẻ hơn tự dựng" → **economies of scale**. "Stop guessing capacity" là một lợi ích riêng, không phải lý do giá thấp.

</details>

## Câu 11 (multiple response — chọn 3)

Khi chọn một AWS Region, đâu là những yếu tố cần cân nhắc? (Chọn 3)

- A. Compliance / data sovereignty
- B. Latency tới người dùng
- C. Màu sắc logo của Region
- D. Pricing của dịch vụ tại Region
- E. Service availability tại Region

<details>
<summary>Đáp án</summary>

**A, B, D, E đều là yếu tố hợp lệ — chọn 3 trong số đó**; C là distractor vô nghĩa. Bốn yếu tố chuẩn khi chọn Region là: compliance/data sovereignty (luật có cho phép dữ liệu ở đó không), latency (Region càng gần người dùng thì độ trễ càng thấp), pricing (giá dịch vụ khác nhau giữa các Region), và service availability (không phải Region nào cũng có đủ mọi dịch vụ, nhất là dịch vụ mới).

Ý cốt lõi cần nhớ: giá và tập dịch vụ *không đồng nhất* giữa các Region, và vị trí địa lý quyết định cả latency lẫn ràng buộc pháp lý. Đây là bộ tiêu chí ra quyết định rất hay bị hỏi.

- C. "Màu sắc logo của Region" là lựa chọn bịa, không tồn tại khái niệm này — loại ngay.
- Bốn phương án A, B, D, E đều đúng về mặt lý thuyết; đề chỉ yêu cầu chọn 3, nên mục tiêu là *nhận ra C là sai* và chọn ba trong bốn cái còn lại.

📌 Nhớ cho đề: bốn tiêu chí chọn Region = **compliance, latency, pricing, service availability**. Giá và dịch vụ khác nhau theo Region.

</details>

## Câu 12 (multiple choice — chọn 1)

Phát biểu nào về Availability Zone là **đúng**?

- A. AZ là điểm phục vụ CDN gần người dùng
- B. Mỗi Region chỉ có đúng một AZ
- C. AZ gồm một hoặc nhiều data center tách biệt trong cùng một Region
- D. AZ là data center nằm trong chính văn phòng của khách hàng

<details>
<summary>Đáp án</summary>

**C.** Availability Zone là một hoặc nhiều data center tách biệt — về nguồn điện, làm mát, và vị trí vật lý — nằm trong cùng một Region, nối với nhau bằng mạng độ trễ thấp, băng thông cao. Mỗi Region gồm *nhiều* AZ (thường vài AZ) để khách hàng xây kiến trúc chịu lỗi.

Cấu trúc phân cấp cần nắm vững: Region (khu vực địa lý) chứa nhiều AZ (các cụm data center cách ly trong vùng đó); Edge Location nằm riêng, gần người dùng, cho CDN. Câu hỏi dạng "phát biểu nào đúng" thường gài bằng cách mô tả thành phần này bằng định nghĩa của thành phần khác.

- A. Mô tả này là của Edge Location (điểm CDN gần người dùng), không phải AZ.
- B. Sai — mỗi Region có *nhiều* AZ (nhiều hơn một), đó chính là cơ sở để đạt high availability.
- D. Mô tả này là của AWS Outposts (hạ tầng AWS đặt trong cơ sở của khách hàng), không phải AZ.

📌 Nhớ cho đề: **AZ = một hoặc nhiều data center tách biệt trong cùng một Region**; mỗi Region có nhiều AZ. Phân biệt rõ với Edge Location và Outposts.

</details>

## Câu 13 (multiple choice — chọn 1)

Đội phát triển có thể dựng môi trường thử nghiệm trong vài phút thay vì chờ mua server vài tuần. Lợi ích nào của cloud mô tả điều này?

- A. Stop spending money running data centers
- B. Increase speed and agility
- C. Trade capex for opex
- D. Economies of scale

<details>
<summary>Đáp án</summary>

**B.** "Increase speed and agility" nói về việc tài nguyên IT sẵn sàng chỉ trong vài phút (thay vì vài tuần chờ mua và lắp server), nhờ đó đội phát triển thử nghiệm, lặp và ra sản phẩm nhanh hơn, giảm mạnh thời gian và chi phí của việc "thử một ý tưởng".

Dấu hiệu nhận ra lợi ích này là từ khóa về *thời gian/tốc độ*: "vài phút thay vì vài tuần", "thử nghiệm nhanh", "giảm time-to-market".

- A. "Stop spending money running data centers" nói về việc thôi phải vận hành/bảo trì data center vật lý — chuyện về *chi phí vận hành phần cứng*, không phải tốc độ cấp phát tài nguyên.
- C. "Trade capex for opex" nói về *hình thức chi phí* (trả trước vs trả theo dùng), không phải tốc độ.
- D. "Economies of scale" nói về *vì sao giá rẻ* nhờ quy mô lớn, không phải tốc độ dựng môi trường.

📌 Nhớ cho đề: "vài phút thay vì vài tuần / thử nghiệm nhanh" → **Increase speed and agility**.

</details>

## Câu 14 (multiple choice — chọn 1)

Một ứng dụng game mobile cần độ trễ cực thấp cho người chơi đang dùng mạng 5G. Giải pháp AWS nào hướng tới trường hợp này?

- A. AWS Outposts
- B. AWS Wavelength
- C. Amazon RDS
- D. AWS Elastic Beanstalk

<details>
<summary>Đáp án</summary>

**B.** AWS Wavelength nhúng compute và storage của AWS ngay *trong mạng 5G của nhà mạng viễn thông*. Nhờ đó dữ liệu từ thiết bị mobile không phải đi vòng qua internet về Region, mà xử lý ngay tại biên mạng 5G → độ trễ cực thấp, rất hợp game mobile, AR/VR, xe tự hành.

Trong nhóm hạ tầng biên, Wavelength là lựa chọn gắn với *mạng 5G/nhà mạng*. Đề nhắc tới "5G" là tín hiệu gần như trực tiếp trỏ tới Wavelength.

- A. AWS Outposts đưa hạ tầng AWS vào data center của khách hàng (on-premises/hybrid), không nhắm vào thiết bị mobile trên 5G.
- C. Amazon RDS là dịch vụ cơ sở dữ liệu quan hệ được quản — không phải giải pháp giảm độ trễ biên cho mạng 5G.
- D. AWS Elastic Beanstalk là nền tảng PaaS để triển khai ứng dụng web — không liên quan tới độ trễ biên trên 5G.

📌 Nhớ cho đề: "5G / mobile / độ trễ cực thấp ở biên mạng viễn thông" → **AWS Wavelength**.

</details>

## Câu 15 (multiple choice — chọn 1)

Phần mềm email dùng ngay qua trình duyệt, không phải quản OS hay server, thuộc mô hình nào?

- A. IaaS
- B. PaaS
- C. SaaS
- D. On-premises

<details>
<summary>Đáp án</summary>

**C.** Dùng một phần mềm trọn gói ngay qua trình duyệt, với nhà cung cấp lo toàn bộ hạ tầng, nền tảng *và* phần mềm bên dưới, chính là Software as a Service (SaaS). Người dùng chỉ việc đăng nhập và dùng tính năng, không chạm tới OS, server hay cập nhật phần mềm. Ví dụ trên AWS là Amazon WorkMail.

Trong ba tầng dịch vụ, SaaS là nơi khách hàng quản *ít nhất* — ngược đầu với IaaS. Dấu hiệu nhận ra SaaS: "dùng ngay qua trình duyệt", "không cài đặt gì", "không quản OS/server".

- A. IaaS là nơi bạn tự quản OS và server (ví dụ EC2) — trái hẳn với "không phải quản OS".
- B. PaaS lo sẵn nền tảng nhưng bạn vẫn phải *viết và triển khai ứng dụng của mình* — ở đây người dùng chỉ dùng một ứng dụng có sẵn, không phát triển gì.
- D. On-premises là chạy phần mềm trên hạ tầng tại chỗ do bạn tự vận hành — trái với việc "dùng ngay qua trình duyệt" từ nhà cung cấp.

📌 Nhớ cho đề: "phần mềm dùng ngay qua trình duyệt, không quản gì bên dưới" → **SaaS**.

</details>

## Related Topics

- [Khái niệm cloud & AWS global infrastructure](../reference/cloud-value-proposition.md)
- [Mục lục AWS](../index.md)
