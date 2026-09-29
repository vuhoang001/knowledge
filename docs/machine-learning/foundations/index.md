---
title: Foundations (Scikit-Learn)
description: "Nền tảng ML — chương 1–9 HOML3: metric, linear model, SVM, cây, ensemble, PCA, clustering."
category: concept
doc_type: index
status: draft
updated: 2026-09-29
---

# Foundations — Scikit-Learn

**Chương 1–9 của HOML3.** Toàn bộ phần này chạy được với `scikit-learn` và một máy
laptop. Không GPU, không vòng lặp train tự viết, không `tensorflow`.

Đây cũng là phần **trả công nhanh nhất**. Với dữ liệu dạng bảng — thứ Data Engineer gặp
hằng ngày — gradient boosting ở chương 7 thường thắng mạng nơ-ron, và chỉ mất vài phút
để train.

Trạng thái: **đang viết**. 4/12 tài liệu và 2 case study đã có, kèm output chạy thật.
Phần còn lại là mục lục dự kiến.

## Nội dung

Năm nhóm chuẩn — giống mọi chủ đề khác trong kho.

### [Tài liệu](reference/index.md) — nó là gì, vì sao, đánh đổi ra sao

| # | Tài liệu | Trả lời câu hỏi | Chương | Mức | TT |
|---|---|---|---|---|---|
| 1 | [ML landscape](reference/ml-landscape.md) | Supervised/unsupervised, batch/online, instance/model-based | 1 | beginner | 🟡 |
| 2 | [Overfitting và underfitting](reference/overfitting-underfitting.md) | Vì sao học thuộc lòng khác với học, và bias/variance | 1, 4 | beginner | 🟡 |
| 3 | [Metric hiệu năng](reference/performance-metrics.md) | RMSE vs MAE; precision, recall, F1, ROC-AUC — dùng cái nào khi nào | 2, 3 | beginner | 🟡 |
| 4 | [Thiết kế API của Scikit-Learn](reference/sklearn-api-design.md) | Estimator, Transformer, Predictor — vì sao mọi thứ ghép được vào pipeline | 2 | beginner | 🟡 |
| 5 | Linear models và gradient descent | Normal equation vs batch/stochastic/mini-batch GD | 4 | intermediate | ⬜ |
| 6 | Regularization | Ridge, Lasso, Elastic Net, early stopping — cái nào zero hoá feature | 4 | intermediate | ⬜ |
| 7 | Logistic và Softmax regression | Từ tổng có trọng số tới xác suất, và nhiều lớp cùng lúc | 4 | intermediate | ⬜ |
| 8 | Support Vector Machine | Large margin, soft margin, và kernel trick thực sự tránh được gì | 5 | advanced | ⬜ |
| 9 | Decision tree | CART tham lam, Gini vs entropy, và vì sao cây variance cao | 6 | intermediate | ⬜ |
| 10 | Ensemble | Bagging, pasting, boosting, stacking — vì sao nhiều mô hình yếu thành một mô hình mạnh | 7 | intermediate | ⬜ |
| 11 | Giảm chiều | Curse of dimensionality, projection vs manifold, PCA và explained variance | 8 | advanced | ⬜ |
| 12 | Clustering | k-means, DBSCAN, Gaussian mixture — và ranh giới giữa chúng | 9 | intermediate | ⬜ |

### Kỹ năng — gặp tình huống X thì xử lý ra sao

| # | Tài liệu | Trả lời câu hỏi | Chương | Mức | TT |
|---|---|---|---|---|---|
| 1 | Đóng khung bài toán | Checklist 8 bước: supervised hay không, online hay batch, đo bằng gì | 2 | beginner | ⬜ |
| 2 | Tách test set | Stratified sampling, và vì sao `train_test_split` ngẫu nhiên làm lệch phân tầng | 2 | beginner | ⬜ |
| 3 | Xử lý giá trị thiếu | Bỏ dòng, bỏ cột, hay `SimpleImputer` — và ai fit cái imputer đó | 2 | beginner | ⬜ |
| 4 | Encode biến hạng mục | Ordinal vs one-hot; khi cardinality cao thì làm gì | 2 | beginner | ⬜ |
| 5 | Scale feature | Standard vs min-max; phân phối đuôi nặng thì log hay quantile | 2 | beginner | ⬜ |
| 6 | Viết transformer riêng | `fit`/`transform`/`get_feature_names_out` — hợp đồng phải giữ | 2 | intermediate | ⬜ |
| 7 | Ghép pipeline | `ColumnTransformer` — mỗi loại cột một nhánh, một lần `fit` duy nhất | 2 | intermediate | ⬜ |
| 8 | Cross-validation | Vì sao một lần chia validation là không đủ để tin | 2 | beginner | ⬜ |
| 9 | Tìm hyperparameter | Grid search vs randomized search — và chi phí thật của mỗi cái | 2 | intermediate | ⬜ |
| 10 | Chọn ngưỡng phân loại | Trượt threshold trên đường precision/recall theo cái nghiệp vụ chịu được | 3 | intermediate | ⬜ |
| 11 | Phân tích lỗi | Đọc confusion matrix để biết *sửa gì tiếp*, không chỉ để báo cáo | 3 | intermediate | ⬜ |
| 12 | Multilabel và multioutput | Một ảnh nhiều nhãn; một đầu ra nhiều chiều | 3 | intermediate | ⬜ |
| 13 | Đọc learning curve | Hai đường hội tụ cao = underfit; hở khe = overfit. Chẩn đoán trước khi sửa | 4 | intermediate | ⬜ |
| 14 | Chọn regularizer | Ridge mặc định; Lasso khi nghi vài feature vô dụng; Elastic Net khi feature tương quan | 4 | intermediate | ⬜ |
| 15 | Ghìm cây khỏi quá sâu | `max_depth`, `min_samples_leaf` — regularization của mô hình phi tham số | 6 | intermediate | ⬜ |
| 16 | Chọn k cho clustering | Inertia luôn giảm nên nó là bẫy; silhouette score sắc hơn | 9 | intermediate | ⬜ |
| 17 | Gán nhãn bán giám sát | Cluster trước, gán nhãn đại diện, rồi lan nhãn — tiết kiệm công gán tay | 9 | advanced | ⬜ |
| 18 | Phát hiện bất thường | Gaussian mixture, Isolation Forest — và ranh giới anomaly vs novelty | 9 | advanced | ⬜ |
| 19 | Chọn thuật toán nào | Bảng quyết định theo kích thước dữ liệu, số feature, yêu cầu giải thích | 1–9 | intermediate | ⬜ |

### Ba nhóm còn lại

| Nhóm | Nội dung |
|---|---|
| [**Case study**](case-studies/index.md) | **2 ca đã viết** — [chọn feature trước khi tách](case-studies/chon-feature-truoc-khi-tach.md) (86,67% trên dữ liệu ngẫu nhiên) · [accuracy cao mà model vô dụng](case-studies/accuracy-cao-ma-model-vo-dung.md) (0.8981 với recall 0) |
| Bài tập | 8 lab chạy thật — dự án end-to-end (ch2), MNIST (ch3), gradient descent viết tay (ch4), SVM boundary (ch5), cây vs rừng (ch6–7), PCA nén ảnh (ch8), phân đoạn ảnh bằng clustering (ch9), và bộ bài tập có đáp số từ end-of-chapter exercises |
| Cheatsheet | API Scikit-Learn · Công thức metric · Bảng chọn thuật toán |
| Case study (còn lại) | 6 ca nữa — scale trước khi split, data snooping, split ngẫu nhiên lệch phân tầng, one-hot phình cột, inertia chọn sai k, cây thuộc lòng nhiễu |

Ký hiệu: ✅ chủ repo đã chạy tay và điền `verified_at` · 🟡 có output chạy thật dán lại,
`verified_at` còn trống · 📝 lý thuyết chưa kiểm chứng · ⬜ chưa viết

**Vì sao 🟡 chứ không phải ✅:** toàn bộ output trong bốn file đầu là thật, chạy tại
`~/learn-lab/ml` ngày 29/09/2026. Nhưng [luật cứng #1](https://github.com/vuhoang001/knowledge/blob/main/CLAUDE.md)
nói `verified_at` chỉ do chủ repo điền sau khi tự chạy — nên nó còn trống.

Cột `#` là thứ tự học **trong từng nhóm**, và cũng là `sidebar_position`.

## Tài liệu hay Kỹ năng?

Cùng ranh giới như data-modeling: **Tài liệu** trả lời *"nó là gì"*, **Kỹ năng** trả lời
*"gặp tình huống X thì làm gì"*.

Biết công thức precision/recall là khái niệm. Biết **ngưỡng nào chấp nhận được cho bài
toán này** là kỹ năng — và đó mới là chỗ quyết định mô hình có dùng được không. Một bộ
lọc thư rác đặt recall cao sẽ chặn nhầm thư thật; đặt precision cao sẽ để lọt rác. Không
có đáp án đúng chung, chỉ có đáp án đúng cho một chi phí nghiệp vụ cụ thể.

## Related Topics

- [Machine Learning](../index.md) — chủ đề cha, lộ trình chung
- [Deep Learning](../deep-learning/index.md) — chương 10–19, phần tiếp theo
- [Python](../../languages/python/index.md) — NumPy và pandas
- [Data Quality](../../data-quality/index.md) — đầu vào bẩn thì mô hình bẩn
