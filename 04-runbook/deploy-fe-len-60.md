---
tags: [runbook, hdos, deploy]
updated: 2026-07-30
---

# Deploy front-end HDOS lên máy .60

Áp dụng cho `hdos-v3` (React/Vite). Backend `hdos-serving` xem [[deploy-be-len-60]].

## Bối cảnh phải biết trước

- `.60` **không có credential GitLab** → `git pull` trên đó không chạy.
- `.60` là **máy dùng chung nhiều dự án** (~18 container: OCR, IOC, Grafana stack…).
  **Không bao giờ `docker prune`.** Lọc theo compose project.
- Repo FE trên `.60` ở `/home/ubuntu/hdos-v3`, nhánh `main`, và **working tree bẩn
  thường trực** — thường tụt sau máy dev vài commit, nhiều file mới còn ở trạng thái
  `??` untracked. Image được build TỪ working tree bẩn đó, không phải từ HEAD.
- Máy dev **không có `sshpass`** → mọi thao tác SSH/SFTP dùng `paramiko`
  (có sẵn trong `python3` hệ thống).

## Quy trình khi chỉ sửa vài file

Bước quan trọng nhất là **bước 1**: biết chính xác mình đang lệch `.60` những gì.
Bỏ qua nó là nguy cơ đè mất việc dở dang của chính mình trên server.

```
1. md5 đối chiếu TOÀN BỘ src/ hai bên
   local:  find src index.html -type f | sort | xargs md5sum
   remote: (qua paramiko) cùng lệnh trong /home/ubuntu/hdos-v3
   → so ra 3 nhóm: chỉ-có-local / chỉ-có-remote / khác-nội-dung

2. Nếu delta đúng bằng đúng số file mình vừa sửa → SFTP đè thẳng, KHỎI bundle.
   Nếu có file "chỉ có ở remote" hoặc lệch ngoài dự kiến → DỪNG, xem đó là gì trước.

3. docker compose up -d --build   (trong /home/ubuntu/hdos-v3)
   env: VITE_API_BASE_URL=http://192.168.100.60:8000/api  FE_PORT=333
   ⚠ URL API được NHÚNG LÚC BUILD — đổi URL là phải build lại, restart không đủ.

4. Verify — đừng tin mỗi log build:
   - docker ps --filter name=hdos-fe
   - curl -o /dev/null -w '%{http_code}' http://192.168.100.60:333/
   - grep chuỗi mới trong bundle đã serve:
     docker exec hdos-fe grep -rlo '<chuỗi tiếng Việt vừa thêm>' /usr/share/nginx/html/assets
   - đếm lại container: phải vẫn đủ 18, không đụng dự án khác
```

## Địa chỉ dịch vụ

| Dịch vụ | Cổng | Ghi chú |
|---|---|---|
| FE | `:333` | |
| Serving API | `:8000/api/v1` | |
| Trino | `:8080` | |
| Port 80 | — | vốn 502 sẵn, không phải mình làm hỏng |

## Còn tồn

Xin deploy token GitLab hoặc đăng ký SSH key cho `.60` để bỏ hẳn trò bundle/SFTP.

<!-- 30/07/2026: chạy quy trình này deploy 19 file (phân trang + lọc cho data
     table). Bước md5 xác nhận delta đúng bằng 19 file, không dính refactor
     formatMoney đang dở → yên tâm đè. -->
