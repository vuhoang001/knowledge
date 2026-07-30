# Việc đang làm

Một file một việc **có đích và có ngày kết thúc**. Đây là mảnh còn thiếu để kho
thành second brain thật: chỗ trả lời *"tôi đang làm dở cái gì, tới đâu rồi, mắc ở đâu"*.

## Vì sao tách khỏi `03-topics`

Hai thứ có **vòng đời trái ngược nhau**:

| | `03-topics/` | `05-projects/` |
|---|---|---|
| Là gì | kiến thức | việc |
| Kết thúc | không bao giờ | có ngày xong |
| Xong rồi | vẫn ôn lại | **đóng, chuyển `done/`** |
| Câu hỏi | "dbt là gì" | "mang dbt về HDOS tới đâu rồi" |

Trộn chung thì file dbt vừa là giáo trình vừa là bảng theo dõi tiến độ, và sáu tháng
sau không biết dòng nào còn đúng.

## Hai loại, khác nhau ở chỗ có đích hay không

**Dự án** — có đích, có ngày xong. `mang-dbt-ve-hdos.md`
**Mảng phụ trách** — chạy mãi, không có đích. `van-hanh-60.md`, `hdos-serving.md`

Mảng phụ trách là thứ Forte gọi là *Area*: không xong bao giờ, nhưng có tiêu chuẩn
phải giữ. Nó khác dự án ở chỗ **không được đóng**, chỉ có tốt lên hoặc xấu đi.

## Một file dự án tốt

Ngắn. Nó là **bảng trạng thái**, không phải nhật ký — nhật ký đã có `01-daily/`.

```markdown
---
type: project
status: active        # active | blocked | done | dropped
started: 2026-07-30
target:               # ngày muốn xong
tags: []
---

# <Tên việc>

## Đích
<Xong nghĩa là gì? Đo bằng cái gì? Không viết được thì chưa phải dự án.>

## Trạng thái
<3 dòng. Cập nhật khi đổi, không phải mỗi ngày.>

## Đang mắc
<Chỗ này quan trọng nhất. Mắc mà không ghi thì tuần sau mắc lại y hệt.>

## Bước tiếp theo
<ĐÚNG MỘT việc, đủ nhỏ để làm trong một buổi.>

## Liên kết
<module đang học · runbook · repo>
```

Xong thì đổi `status: done` và chuyển vào `done/`. Đừng xoá — dự án đã đóng là dữ
liệu tốt nhất để trả lời *"lần trước làm cái tương tự mất bao lâu"*.

## Mục lục

| Việc | Trạng thái | Bước tiếp theo |
|---|---|---|
| *(chưa có — tạo cái đầu tiên khi bắt tay vào việc gì đó nhiều hơn một buổi)* | | |
