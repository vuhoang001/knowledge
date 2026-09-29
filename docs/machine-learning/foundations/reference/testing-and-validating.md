---
title: Kiểm thử, thẩm định và train-dev set
sidebar_position: 7
description: "Mỗi tập dữ liệu trả lời đúng một câu hỏi. Một tập bị tiêu mất ngay khi bạn ra quyết định từ nó, kể cả khi không train trên nó."
tags: [test-set, validation-set, train-dev, cross-validation, no-free-lunch, homl3, chuong-1]
domain: ai
category: concept
doc_type: reference
status: draft
difficulty: beginner
verified_at:
updated: 2026-09-29
---

# Kiểm thử, thẩm định và train-dev set

> **Chốt:** **Một tập dữ liệu bị tiêu mất ngay khoảnh khắc bạn ra một quyết định từ
> nó** — kể cả khi không hề train trên nó. Chọn giá trị tốt nhất trong 100 giá trị
> hyperparameter bằng lỗi test là **đã khớp một con số** vào tập test, và đó là cách
> 5% đo được biến thành 15% ở production.

## Mục tiêu

Có một luật máy móc thay cho trực giác: **một tập, một câu hỏi** — và câu hỏi của test
set chỉ được hỏi **đúng một lần**.

## Tổng quan

### Mỗi tập trả lời đúng một câu

| Tập | Cắt ra từ đâu | Câu hỏi nó trả lời |
|---|---|---|
| **training set** | phần lớn dữ liệu | không câu nào — model học từ nó |
| **validation set** (*dev set*) | cắt ra từ **training set** | model ứng viên nào tốt nhất? |
| **test set** | giữ lại, dùng **một lần** ở cuối | nên kỳ vọng sai số bao nhiêu trên dữ liệu mới? |
| **train-dev set** | cắt ra từ **dữ liệu train**, chỉ khi dữ liệu đó không giống production | model có đang overfit không? |

> Hãy nghĩ về test set như một **mẫu đối chiếu đã niêm phong**. Bạn kiểm kết quả cuối
> với nó **một lần**. Cứ chỉnh đi chỉnh lại cho tới khi mẫu đó khớp, thì tất cả những gì
> bạn chứng minh được là **nó khớp với đúng mẫu đó**.

### Training set và test set

Cách duy nhất biết model khái quát hoá tốt đến đâu là **thử nó trên ca mới**. Đẩy thẳng
lên production để biết cũng là một cách — nhưng nếu nó tệ thì người dùng sẽ phàn nàn.

- Tỷ lệ lỗi trên test set là **generalization error** (hay *out-of-sample error*).
- **Lỗi train thấp cộng generalization error cao chính là overfitting, phát biểu bằng số.**
- Tỷ lệ chia thông dụng là **80/20**. Với tập rất lớn thì ít hơn 20% nhiều vẫn thừa: 10
  triệu instance mà giữ lại **1%** đã cho test set **100.000 dòng**.

### Chọn model mà không tự lừa mình

Đây là chỗ người ta sai. Train 100 model với 100 giá trị hyperparameter và giữ cái có
lỗi test thấp nhất — **bạn đang thích nghi model với đúng tập test đó**, và 5% đo được
thành 15% ở production.

Cách chữa là **holdout validation**:

```text
1. Cat mot phan training set ra lam validation set
2. Train cac model ung vien tren training set da thu nho
3. Chon cai tot nhat tren validation set
4. Train lai ke thang do tren TOAN BO training set
5. Do DUNG MOT LAN tren test set
```

Bước 4 dễ bị bỏ qua và nó quan trọng: kẻ thắng được chọn bằng một tập train nhỏ hơn, nên
phải cho nó train lại trên tất cả trước khi công bố.

### Validation set phải đúng cỡ

| Validation set | Hỏng ở đâu |
|---|---|
| **Quá nhỏ** | So sánh **nhiễu**, nên có thể phong nhầm kẻ thắng |
| **Quá lớn** | Tập train bị thu nhỏ quá nhiều, nên bạn đang so các model train trên **ít dữ liệu hơn hẳn** so với model cuối cùng |

Hình ảnh của sách cho vế "quá lớn": **chọn người chạy nước rút nhanh nhất để đi chạy
marathon.**

**Cross-validation** mua đường thoát khỏi cả hai, bằng cách lặp lại với nhiều validation
set nhỏ rồi lấy trung bình. Cái giá được nói thẳng: **thời gian train nhân lên theo số
validation set**. Thứ bạn mua được là **một phép so sánh đáng tin hơn, không phải một
model tốt hơn.**

### Data mismatch và train-dev set

Một cái bẫy nữa: **data mismatch** — có rất nhiều dữ liệu train nhưng nó **không giống**
dữ liệu production. **Train-dev set** của Andrew Ng chẩn đoán đúng chỗ đó.

Ví dụ của sách: app điện thoại nhận diện hoa. Tải được **hàng triệu** ảnh hoa từ web,
nhưng chỉ có khoảng **1.000** ảnh thật sự chụp bằng app — và chỉ chúng đại diện cho
production.

| Tập | Cắt ra từ | Vì sao |
|---|---|---|
| Train | ảnh web | nhiều |
| **Train-dev** | **ảnh web** | trông giống dữ liệu train |
| Dev | **ảnh app** | phải giống production nhất có thể |
| Test | **ảnh app** | phải giống production nhất có thể |

Rồi đánh giá **theo thứ tự**:

```text
danh gia tren train-dev set (giong du lieu train)
  |-- te  -> OVERFITTING
  |-- tot -> danh gia tren dev set (giong production)
                |-- te -> DATA MISMATCH
```

> **Train-dev set tồn tại vì hai thất bại trông y hệt nhau.** Một điểm dev tệ, tự nó,
> **không nói được** model đã học thuộc dữ liệu train hay dữ liệu train đơn giản là
> không giống production. Hai bệnh này **chữa hoàn toàn khác nhau** — và không lượng
> regularization nào chữa được cái thứ hai.

Chú ý điều kiện: **chỉ cần train-dev khi bạn *cố ý* train trên dữ liệu không đến từ
production.** Cách chữa data mismatch là tiền xử lý ảnh web cho giống ảnh app rồi train lại.

### No free lunch theorem

**Không có giả định nào về dữ liệu thì không model nào tốt hơn model nào một cách tiên
nghiệm.** *A priori* nghĩa là "trước khi thử".

**Chọn một model tự nó đã là một giả định:** chọn model tuyến tính là đang giả định dữ
liệu về cơ bản là tuyến tính. Trong thực hành, bạn đưa ra vài giả định hợp lý và **đánh
giá một nhúm model**.

## Ví dụ

Chạy thật 29/09/2026 tại `~/learn-lab/ml` — scikit-learn 1.9.1, seed `random_state=42`,
trên bộ 27 quốc gia của sách.

Giữ lại 20% làm test set:

```text
tach 80/20 tren 27 nuoc (seed 42): test = ['Germany', 'Israel', 'Russia', 'Slovenia', 'Spain', 'United Kingdom']
   RMSE train (21 nuoc): 0.38
   RMSE test  (6 nuoc): 0.44
   lech nhat: Israel — doan 6.29, that 7.2
```

| | số nước | sai số điển hình (RMSE) |
|---|---|---|
| training set | 21 | **0,38** |
| test set | 6 | **0,44** |

Con số test — **0,44** — là **ước lượng của generalization error**: model sẽ lệch chừng
đó trên những quốc gia nó chưa từng thấy. Nó **tệ hơn** con số train, đúng như kỳ vọng.

Nước lệch nhất trong test set là **Israel: dự đoán 6,29, thật 7,2**.

**Chú ý cỡ của test set: 6 quốc gia.** Với 6 điểm, con số 0,44 tự nó rất nhiễu — đổi seed
thì nó nhảy. Đó đúng là vế "quá nhỏ" của bảng trên, và là lý do bộ dữ liệu 27 dòng này
tốt để dạy nhưng vô dụng để quyết định.

## Trade-offs

| Test set lớn | Test set nhỏ |
|---|---|
| Ước lượng generalization error chắc hơn | Ước lượng nhiễu, đổi theo seed |
| Ít dữ liệu để train | Nhiều dữ liệu để train |
| Đáng khi dữ liệu ít | Đủ khi dữ liệu rất nhiều (1% của 10 triệu = 100.000) |

| Holdout validation | Cross-validation |
|---|---|
| Train một lần, nhanh | Train **nhiều lần** — thời gian nhân lên |
| So sánh nhiễu nếu tập nhỏ | So sánh đáng tin hơn |
| Đủ khi dữ liệu nhiều | Cần khi dữ liệu ít |

**Cross-validation mua một phép so sánh đáng tin hơn, không mua một model tốt hơn.**

## Common Mistakes

| Lỗi | Hậu quả |
|---|---|
| Chỉnh hyperparameter bằng test set | **5% đo được thành 15% ở production** |
| Nhìn test set nhiều lần "chỉ để xem" | Mỗi lần nhìn để ra quyết định là một lần tiêu nó |
| Quên train lại kẻ thắng trên toàn bộ training set | Ship một model train trên ít dữ liệu hơn cần thiết |
| Validation set quá lớn | Chọn người chạy nước rút để đi chạy marathon |
| Validation set quá nhỏ | Phong nhầm kẻ thắng vì nhiễu |
| Dùng train-dev khi không có data mismatch | Thừa một tập, mất dữ liệu train vô ích |
| Đổ lỗi overfitting khi thật ra là data mismatch | Tăng regularization mãi; **không lượng nào chữa được** |
| Báo cáo điểm test mà không nói cỡ test set | 0,44 trên 6 dòng và 0,44 trên 6.000 dòng là hai thứ khác nhau |

## FAQ

<details>
<summary>Train trên ảnh web, production là ảnh điện thoại. Model tốt trên train-dev và tệ trên dev. Chẩn đoán?</summary>

**Data mismatch**, không phải overfitting. Nó làm tốt trên train-dev — tập cắt ra từ
*cùng nguồn web* — nên nó **không** học thuộc dữ liệu train. Nó tệ trên dev, tập gồm ảnh
app, nên vấn đề là **hai nguồn không giống nhau**.

Cách chữa: tiền xử lý ảnh web cho giống ảnh app rồi train lại. **Tăng regularization sẽ
không giúp gì**, và đó chính là lý do train-dev set tồn tại.

</details>

<details>
<summary>Nếu không model nào tốt hơn model nào tiên nghiệm, vì sao ai cũng bắt đầu từ cùng vài model chuẩn?</summary>

Vì **không ai thật sự "không có giả định nào"**. Định lý nói về **mọi** bài toán có thể
hình dung, kể cả những bài toán mà dữ liệu hoàn toàn ngẫu nhiên hoặc đối nghịch.

Dữ liệu thật thì **không** như vậy: nó có cấu trúc, thường trơn, thường quan hệ gần
tuyến tính hoặc phân cấp. Các model chuẩn mã hoá đúng những giả định đó. Định lý không
bị vi phạm; nó chỉ không áp dụng cho tập bài toán mà người ta thật sự gặp.

</details>

<details>
<summary>Test set có được dùng lại cho model tiếp theo không?</summary>

Về lý thuyết thì không, và mỗi lần dùng lại nó **bớt đáng tin đi một chút**. Trong thực
hành người ta vẫn dùng lại, nên hai biện pháp: **đổi mới test set định kỳ** bằng dữ liệu
mới, và **ghi lại số lần đã chạm vào nó** — một test set đã quyết định 50 lần thì không
còn là mẫu chưa thấy nữa.

</details>

<details>
<summary>Vì sao lỗi test lại nên cao hơn lỗi train? Nếu nó thấp hơn thì sao?</summary>

Cao hơn là bình thường: model được tối ưu trên tập train, nên nó khớp tập đó tốt hơn.

Thấp hơn **đáng kể** gần như luôn là **bug** — thường là rò rỉ, hoặc test set tình cờ
dễ hơn. Xem
[case study: chọn feature trước khi tách](../case-studies/chon-feature-truoc-khi-tach.md)
và dòng cuối của [bảng chẩn đoán](overfitting-underfitting.md).

Với test set 6 dòng như ví dụ trên, chênh lệch theo chiều nào cũng có thể chỉ là nhiễu.

</details>

<details>
<summary>Cross-validation có thay được test set không?</summary>

**Không.** Cross-validation thay được **validation set** — nó trả lời câu hỏi *"model
nào tốt nhất"*. Test set trả lời câu hỏi khác: *"kẻ thắng thật sự sai bao nhiêu"*.

Dùng cross-validation để chọn model rồi báo cáo điểm cross-validation làm kết quả cuối
là **cùng một lỗi** với chỉnh hyperparameter trên test set, chỉ ở một tầng khác.

</details>

## Related Topics

- [Overfitting và underfitting](overfitting-underfitting.md) — lỗi train thấp + lỗi test cao, phát biểu bằng số
- [Dữ liệu xấu](bad-data.md) — dữ liệu không đại diện là data mismatch nhìn từ phía dữ liệu
- [Thiết kế API của Scikit-Learn](sklearn-api-design.md) — pipeline giữ các tập không rò vào nhau
- [Metric hiệu năng](performance-metrics.md) — đo bằng gì thì "lỗi" mới có nghĩa
- [Case study: chọn feature trước khi tách](../case-studies/chon-feature-truoc-khi-tach.md)

## References

- Aurélien Géron — *Hands-On Machine Learning*, 3rd ed., chương 1, bài b11
- David Wolpert (1996) — *The Lack of A Priori Distinctions Between Learning Algorithms*
