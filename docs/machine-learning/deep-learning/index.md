---
title: Deep Learning (Keras / TensorFlow)
description: "Chương 10–19 HOML3 — MLP, train mạng sâu, CNN, RNN, transformer, mô hình sinh, RL, và deploy."
category: concept
doc_type: index
status: draft
updated: 2026-09-29
---

# Deep Learning — Keras / TensorFlow

**Chương 10–19 của HOML3.** Phần này bắt đầu khi `model.fit()` không còn đủ: phải biết
khởi tạo trọng số thế nào, optimizer nào, khi nào mạng ngừng học và vì sao.

**Đừng vào đây trước khi xong [Foundations](../foundations/index.md).** Không phải vì
thứ tự sách, mà vì mọi lỗi ở đây đều khó chẩn đoán hơn: loss không giảm có thể là learning
rate, có thể là init, có thể là dữ liệu chưa scale, có thể là kiến trúc sai. Ở phần
Foundations mỗi lỗi chỉ có một nghi phạm.

Trạng thái: **chưa bắt đầu**. Bảng dưới là mục lục dự kiến.

## Nội dung

### Tài liệu — nó là gì, vì sao, đánh đổi ra sao

| # | Tài liệu | Trả lời câu hỏi | Chương | Mức | TT |
|---|---|---|---|---|---|
| 1 | Perceptron và MLP | Từ một nơ-ron tới mạng nhiều lớp — cái gì làm nó phi tuyến | 10 | beginner | ⬜ |
| 2 | Backpropagation | Gradient chảy ngược qua mạng — cơ chế, không phải phép màu | 10 | intermediate | ⬜ |
| 3 | Ba API của Keras | Sequential, Functional, Subclassing — mỗi cái mua gì, mất gì | 10 | beginner | ⬜ |
| 4 | Hàm kích hoạt | ReLU và họ hàng; vì sao sigmoid làm chết gradient ở mạng sâu | 11 | intermediate | ⬜ |
| 5 | Optimizer | Momentum → Nesterov → AdaGrad → RMSProp → Adam → AdamW | 11 | intermediate | ⬜ |
| 6 | Batch normalization | Chuẩn hoá giữa lớp — và vì sao nó thay được init cẩn thận | 11 | intermediate | ⬜ |
| 7 | Lõi TensorFlow | Tensor, Variable, autodiff, `tf.function` và graph | 12 | advanced | ⬜ |
| 8 | Pipeline `tf.data` | Shuffle, interleave, prefetch — GPU đói là lỗi của pipeline | 13 | intermediate | ⬜ |
| 9 | CNN | Convolution, pooling, và đường từ LeNet-5 tới EfficientNet | 14 | intermediate | ⬜ |
| 10 | RNN | Nơ-ron hồi quy, BPTT, LSTM và GRU — cổng giải quyết cái gì | 15 | advanced | ⬜ |
| 11 | Attention và Transformer | Vì sao bỏ hẳn hồi quy lại tốt hơn; multi-head, positional encoding | 16 | advanced | ⬜ |
| 12 | Mô hình sinh | Autoencoder → VAE → GAN → Diffusion, ba cách sinh khác hẳn nhau | 17 | advanced | ⬜ |
| 13 | Reinforcement learning | MDP, Q-value, policy gradient — học từ phần thưởng chứ không từ nhãn | 18 | advanced | ⬜ |
| 14 | Serving và phân tán | TF Serving, Vertex AI, TFLite; data parallelism vs model parallelism | 19 | intermediate | ⬜ |

### Kỹ năng — gặp tình huống X thì xử lý ra sao

| # | Tài liệu | Trả lời câu hỏi | Chương | Mức | TT |
|---|---|---|---|---|---|
| 1 | Khởi tạo trọng số | Glorot, He, LeCun — chọn theo hàm kích hoạt, không chọn bừa | 11 | intermediate | ⬜ |
| 2 | Gradient clipping | Gradient nổ thì cắt ở đâu, và khi nào cần tới nó | 11 | intermediate | ⬜ |
| 3 | Transfer learning | Đóng băng lớp nào, mở lại lúc nào, learning rate bao nhiêu sau khi mở | 11, 14 | intermediate | ⬜ |
| 4 | Lịch learning rate | Power, exponential, piecewise, 1cycle — và cái nào đáng thử trước | 11 | intermediate | ⬜ |
| 5 | Dropout và L1/L2 | Ba cách ghìm overfit, và Monte Carlo dropout lúc inference | 11 | intermediate | ⬜ |
| 6 | Callback của Keras | Early stopping, checkpoint, TensorBoard — dừng đúng lúc và cứu được model | 10 | beginner | ⬜ |
| 7 | Tuning mạng nơ-ron | Keras Tuner; bao nhiêu lớp, bao nhiêu nơ-ron, batch size bao nhiêu | 10 | intermediate | ⬜ |
| 8 | Lưu và nạp model | Lưu gì, mất gì, và cách nạp model có thành phần tự viết | 10, 12 | beginner | ⬜ |
| 9 | Loss, metric, layer tự viết | Hợp đồng `call`/`build`/`get_config` — thiếu cái nào thì không nạp lại được | 12 | advanced | ⬜ |
| 10 | Vòng lặp train tự viết | Khi nào `fit()` không đủ, và cái giá phải trả khi bỏ nó | 12 | advanced | ⬜ |
| 11 | Preprocessing layer | Normalization, Discretization, StringLookup, embedding — trong graph, không ngoài | 13 | intermediate | ⬜ |
| 12 | TFRecord và protobuf | Khi nào dữ liệu phải đổi định dạng, và chi phí của việc đó | 13 | advanced | ⬜ |
| 13 | Tiền xử lý văn bản | TextVectorization, tokenizer, và model ngôn ngữ dựng sẵn | 13, 16 | intermediate | ⬜ |
| 14 | Phát hiện và phân đoạn vật thể | Localization, YOLO, FCN, semantic segmentation | 14 | advanced | ⬜ |
| 15 | Dự báo time series | Chuẩn bị cửa sổ, baseline naive, dự báo nhiều bước, seq2seq | 15 | intermediate | ⬜ |
| 16 | Stateful RNN và masking | Giữ hidden state qua batch; bỏ qua padding cho đúng | 16 | advanced | ⬜ |
| 17 | Beam search | Vì sao chọn tham lam từng token lại ra câu tệ | 16 | advanced | ⬜ |
| 18 | Giữ GAN train ổn định | Mode collapse, mất cân bằng generator/discriminator, progressive growing | 17 | advanced | ⬜ |
| 19 | Deep Q-learning | Replay buffer, target network, double DQN | 18 | advanced | ⬜ |
| 20 | Distribution strategy | MirroredStrategy, MultiWorker — và lúc nào thêm GPU không nhanh hơn | 19 | advanced | ⬜ |
| 21 | Đưa model lên production | TF Serving, REST vs gRPC, đổi phiên bản không downtime | 19 | intermediate | ⬜ |

### Ba nhóm còn lại

| Nhóm | Nội dung dự kiến |
|---|---|
| Bài tập | 10 lab chạy thật — Fashion-MNIST bằng Keras (ch10), mẹo train mạng sâu (ch11), vòng lặp tự viết (ch12), pipeline `tf.data` (ch13), CNN trên CIFAR (ch14), RNN time series (ch15), char-RNN và transformer (ch16), autoencoder + GAN (ch17), DQN CartPole (ch18), TF Serving (ch19) |
| Cheatsheet | **Cấu hình DNN mặc định** (bảng chương 11) · API Keras · Bảng chọn optimizer · Bảng chọn kiến trúc |
| Case study | 9 ca — gradient biến mất ở lớp sâu, batchnorm đặt sai chỗ, Adam hội tụ nhanh mà generalize kém, dropout bật nhầm lúc inference, thiếu `prefetch` làm GPU chờ, unfreeze quá sớm phá pretrained weight, RNN chỉ học lặp giá trị cuối, GAN mode collapse, preprocessing lúc serve lệch lúc train |

Ký hiệu: ✅ đã chạy tay và xác nhận · 📝 lý thuyết, `verified_at` còn trống · ⬜ chưa viết

## Cheatsheet nào viết trước

**Bảng cấu hình DNN mặc định của chương 11.** Géron đưa một bảng "dùng cái này khi chưa
biết dùng gì" — He init, ReLU, Adam, early stopping. Nó tiết kiệm được nhiều buổi hơn bất
kỳ trang lý thuyết nào trong phần này, vì nó biến câu hỏi *"chọn gì"* thành *"có lý do gì
để lệch khỏi mặc định không"*.

## Con số phải ghi lại trong mọi lab

Khác lab SQL ở chỗ kết quả **không tất định**. Một note ghi "accuracy 0.91" mà thiếu bốn
thứ dưới đây thì sáu tháng sau không dựng lại được, và luật *"chưa chạy được thì chưa
gọi là học"* trở thành hình thức:

- seed (`tf.random.set_seed`, `np.random.seed`)
- phiên bản `tensorflow` / `scikit-learn`
- chạy trên CPU hay GPU nào
- số epoch và batch size

## Related Topics

- [Machine Learning](../index.md) — chủ đề cha, lộ trình chung
- [Foundations](../foundations/index.md) — chương 1–9, phải xong trước
- [Python](../../languages/python/index.md) — NumPy, nền của tensor
