# Runbook

Thao tác **sẽ làm lại y hệt**: deploy, seed, khôi phục, dựng môi trường.

Khác `02-notes` ở chỗ: note trả lời *vì sao*, runbook trả lời *gõ gì*. Runbook mà
không có lệnh chạy được thì nó là note đặt nhầm chỗ.

## Một runbook tốt

- **Có bối cảnh phải biết trước.** Cạm bẫy của môi trường (máy dùng chung, không có
  credential, working tree bẩn) đặt lên đầu, trước các bước. Người đọc lúc 11 giờ đêm
  cần biết cái gì sẽ nổ trước khi họ gõ.
- **Lệnh sao chép dán được**, không phải mô tả.
- **Có bước verify.** "Chạy xong" không phải là "chạy đúng". Ghi rõ kiểm bằng lệnh gì
  và kết quả đúng trông ra sao.
- **Ghi ngày kiểm gần nhất.** Runbook sai nguy hiểm hơn không có runbook.

## Mục lục

| Runbook | Kiểm gần nhất |
|---|---|
| [Deploy front-end HDOS lên .60](deploy-fe-len-60.md) | 30/07/2026 |
