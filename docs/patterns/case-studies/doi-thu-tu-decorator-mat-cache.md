---
title: Thực tập sinh đọc được bảng lương
sidebar_position: 8
description: "Đổi một dòng nối dây làm cache nằm ngoài kiểm quyền — lần đọc thứ hai trả về từ cache và lớp phân quyền không bao giờ chạy."
tags: [case-study, decorator, proxy, authorization, caching]
domain: backend
category: pattern
doc_type: case-study
status: draft
difficulty: intermediate
verified_at:
updated: 2026-08-04
---

# Thực tập sinh đọc được bảng lương

> **Nhãn: tình huống dựng lại.** Mọi con số chạy thật bằng `dotnet run 14-decorator.cs`
> trên .NET 11.0.0.

## Bối cảnh

Kho dữ liệu nhân sự được bọc bởi hai [Decorator](../skills/decorator.md): kiểm quyền và
cache.

```csharp
sealed class BocKiemQuyen(IKho trong) : IKho
{
    private static readonly HashSet<string> _duocPhep = ["ke_toan", "giam_doc"];
    public string Doc(string nguoiDung, string ma)
    {
        if (!_duocPhep.Contains(nguoiDung)) throw new UnauthorizedAccessException($"{nguoiDung} khong duoc xem {ma}");
        return trong.Doc(nguoiDung, ma);
    }
}

sealed class BocCache(IKho trong) : IKho { ... }
```

Nối dây ban đầu:

```csharp
services.AddScoped<IKho, KhoThat>();
services.Decorate<IKho, BocKiemQuyen>();
services.Decorate<IKho, BocCache>();      // <- boc lan cuoi = nam NGOAI cung
```

Một PR "tối ưu hiệu năng" đảo hai dòng `Decorate`.

## Triệu chứng

Không có triệu chứng.

Hệ thống chạy nhanh hơn, không lỗi, không alert. Vấn đề được phát hiện ba tháng sau, khi
một thực tập sinh nhắc đến con số lương của một đồng nghiệp trong bữa trưa.

```text
=== Thu tu A: Cache boc NGOAI KiemQuyen  (cache truoc, kiem sau) ===
  ke toan  doc BL-01: bang luong BL-01 = 82.500.000
  thuc tap doc BL-01: bang luong BL-01 = 82.500.000  [cache]
  so lan kiem quyen that su chay: 1
```

**Bộ đếm kiểm quyền dừng ở 1.** Kế toán đọc trước — hợp lệ, kết quả vào cache. Thực tập
sinh đọc sau — cache trả lời ngay, và `BocKiemQuyen` **không bao giờ được gọi**.

## Giả thuyết sai lúc đầu

| Nghi ngờ | Vì sao nghe hợp lý | Vì sao sai |
|---|---|---|
| Cấu hình phân quyền sai | Triệu chứng là chuyện quyền | Kiểm bảng phân quyền: `thuc_tap` không có quyền, đúng như mong đợi |
| Có endpoint khác không qua kiểm quyền | Kinh điển | Rà hết controller: mọi đường đều đi qua `IKho` |
| Ai đó chia sẻ mật khẩu | Dễ nghĩ nhất | Log đăng nhập cho thấy đúng tài khoản thực tập sinh |
| `BocKiemQuyen` có bug | Gần đúng | Unit test của nó xanh, và đọc code thấy hoàn toàn đúng |

Giả thuyết cuối là nơi mất nhiều thời gian nhất: đội đọc đi đọc lại `BocKiemQuyen`, viết
thêm test cho nó, và **mọi test đều xanh** — vì lớp đó không hề sai.

Bước ngoặt là câu hỏi: *"lớp kiểm quyền có thật sự được gọi không?"* Thêm một bộ đếm và
chạy lại hai lần đọc liên tiếp là thấy ngay.

## Nguyên nhân thật

Cả hai decorator đều **đúng theo đặc tả riêng của chúng**:

- `BocCache`: "nếu đã có trong cache thì trả về, đừng gọi vào trong."
- `BocKiemQuyen`: "kiểm quyền rồi mới gọi vào trong."

Ghép lại theo thứ tự `Cache(KiemQuyen(kho))`, câu đầu vô hiệu hoá câu sau.

Thứ tự đúng:

```text
=== Thu tu B: KiemQuyen boc NGOAI Cache  (kiem truoc, cache sau) ===
  ke toan  doc BL-01: bang luong BL-01 = 82.500.000
  thuc tap doc BL-01: TU CHOI (thuc_tap khong duoc xem BL-01)
  so lan kiem quyen that su chay: 2
```

Và điều quan trọng: **cache không mất hiệu quả gì**.

```text
=== So lan cham kho that (cache co chay khong) ===
  thu tu A: 1   thu tu B: 1
```

Cả hai thứ tự đều chỉ chạm kho thật **một lần**. Thứ tự B không đánh đổi hiệu năng lấy an
toàn — nó chỉ đúng hơn. PR "tối ưu hiệu năng" đã không tối ưu gì cả.

### Quy tắc thứ tự

| Nhóm decorator | Vị trí | Vì sao |
|---|---|---|
| Kiểm quyền, xác thực, kiểm tra đầu vào | **Ngoài cùng** | Phải chạy cho mọi lời gọi |
| Log, đo thời gian, tracing | Ngoài, ngay sau kiểm quyền | Muốn thấy cả lời gọi bị từ chối |
| Cache | Giữa | Sau kiểm quyền, trước retry |
| Retry, circuit breaker, timeout | **Trong cùng**, sát nguồn | Chỉ thử lại thao tác thật |

Cùng cơ chế cũng đổi số dòng log:

```text
=== Log ngoai vs trong Retry: dem so dong log ===
  Log(Retry(kho)) -> ton kho SP-9 = 42, so dong log = 1
  Retry(Log(kho)) -> ton kho SP-9 = 42, so dong log = 3
```

## Vì sao không test nào bắt được

| Kiểm tra | Kết quả | Vì sao không thấy |
|---|---|---|
| Unit test `BocKiemQuyen` | Xanh | Lớp đó đúng — nó chỉ không được gọi |
| Unit test `BocCache` | Xanh | Lớp đó cũng đúng |
| Test tích hợp "thực tập sinh bị từ chối" | **Xanh** | Nó chạy trên container mới, cache rỗng — lần đọc đầu luôn qua kiểm quyền |
| Code review PR | Trượt | PR chỉ đảo hai dòng, trông vô hại |
| Quét bảo mật tĩnh | Im lặng | Không có luật nào về thứ tự decorator |

**Dòng thứ ba là bài học chính.** Test tích hợp *có* kiểm đúng kịch bản, và vẫn xanh — vì
nó chỉ đọc **một lần**. Lỗ hổng chỉ xuất hiện ở lần đọc **thứ hai**, sau khi ai đó hợp lệ
đã làm nóng cache.

Test đúng phải là:

```csharp
[Fact] void Nguoi_khong_co_quyen_bi_tu_choi_ke_ca_khi_cache_da_nong()
{
    var kho = ChuoiThat();                    // dung composition root that
    kho.Doc("ke_toan", "BL-01");              // lam nong cache
    Assert.Throws<UnauthorizedAccessException>(() => kho.Doc("thuc_tap", "BL-01"));
}
```

Hai chi tiết bắt buộc: dùng **chuỗi thật từ composition root** (không dựng tay từng lớp),
và **làm nóng cache trước**.

## Cách sửa

### Sửa gấp

Đảo lại thứ tự `Decorate`, kèm comment ghi rõ lý do:

```csharp
services.AddScoped<IKho, KhoThat>();
services.Decorate<IKho, BocCache>();          // trong: cache sat nguon
services.Decorate<IKho, BocKiemQuyen>();      // NGOAI CUNG: phai chay cho MOI loi goi.
                                              // Dao thu tu nay = thung phan quyen. Xem test o duoi.
```

Và **xoá sạch cache** sau khi deploy — cache hiện tại chứa dữ liệu đã được phục vụ sai.

### Sửa cấu trúc — đưa danh tính vào khoá cache

Nếu cache **phải** nằm ngoài vì lý do hiệu năng, thì khoá cache phải gồm cả người dùng:

```csharp
var khoa = $"{nguoiDung}|{ma}";
```

Lúc đó cache của kế toán không phục vụ được thực tập sinh. Đổi lại: tỷ lệ trúng cache giảm
mạnh, và cache phình theo số người dùng.

**Với dữ liệu nhạy cảm, thứ tự đúng (kiểm quyền ngoài cùng) gần như luôn tốt hơn**, vì nó
không phụ thuộc việc ai đó nhớ đưa danh tính vào khoá.

### Chặn tái diễn

Một test khoá thứ tự, chạy trên chuỗi thật, cho **mỗi** ranh giới bảo mật. Đây là loại test
rẻ và bắt đúng lỗi mà unit test không thấy.

## Dấu hiệu nhận ra sớm

```bash
# Thu tu Decorate — dong cuoi cung la lop NGOAI cung
grep -rn "Decorate<" --include=*.cs src/
```

Ba câu hỏi cho code review:

1. Decorator nào đang ở **ngoài cùng**? Nếu không phải kiểm quyền, vì sao?
2. Có decorator nào **short-circuit** (cache, circuit breaker) nằm ngoài một decorator có
   trách nhiệm bảo mật không?
3. Test phân quyền có chạy **hai lần** không? Một lần thì cache luôn rỗng và test vô nghĩa.

## Related Topics

- [Decorator](../skills/decorator.md) — thứ tự bọc và quy tắc xếp lớp
- [Proxy](../skills/proxy.md) — protection proxy, cùng vị trí trong chuỗi
- [Case study — Design Patterns](index.md)
