---
title: Deep Learning (Keras / TensorFlow)
description: "HOML3 chapters 10–19 — MLPs, training deep nets, CNNs, RNNs, transformers, generative models, RL, and deployment."
category: concept
doc_type: index
status: draft
updated: 2026-09-29
---

# Deep Learning — Keras / TensorFlow

**Chapters 10–19 of HOML3.** This part begins where `model.fit()` stops being enough:
you have to know how the weights are initialised, which optimizer to use, and when the
network stopped learning and why.

**Do not start here before finishing [Foundations](../foundations/index.md).** Not
because of the book's order, but because every failure here is harder to diagnose: a loss
that will not drop could be the learning rate, the initialisation, unscaled data, or the
wrong architecture. In Foundations each failure has exactly one suspect.

Status: **not started**. The tables below are a planned table of contents.

## Contents

### Reference — what it is, why, what the trade-off is

| # | Document | Answers the question | Ch. | Level | St |
|---|---|---|---|---|---|
| 1 | Perceptron and MLP | From one neuron to a multilayer network — what makes it nonlinear | 10 | beginner | ⬜ |
| 2 | Backpropagation | Gradients flowing backwards through the net — the mechanism, not magic | 10 | intermediate | ⬜ |
| 3 | Keras' three APIs | Sequential, Functional, Subclassing — what each buys and what it costs | 10 | beginner | ⬜ |
| 4 | Activation functions | ReLU and its family; why sigmoid kills gradients in deep nets | 11 | intermediate | ⬜ |
| 5 | Optimizers | Momentum → Nesterov → AdaGrad → RMSProp → Adam → AdamW | 11 | intermediate | ⬜ |
| 6 | Batch normalization | Normalising between layers — and why it can replace careful initialisation | 11 | intermediate | ⬜ |
| 7 | TensorFlow core | Tensors, Variables, autodiff, `tf.function` and graphs | 12 | advanced | ⬜ |
| 8 | The `tf.data` pipeline | Shuffle, interleave, prefetch — a starving GPU is the pipeline's fault | 13 | intermediate | ⬜ |
| 9 | CNNs | Convolution, pooling, and the road from LeNet-5 to EfficientNet | 14 | intermediate | ⬜ |
| 10 | RNNs | Recurrent neurons, BPTT, LSTM and GRU — what the gates actually solve | 15 | advanced | ⬜ |
| 11 | Attention and Transformers | Why dropping recurrence entirely works better; multi-head, positional encoding | 16 | advanced | ⬜ |
| 12 | Generative models | Autoencoder → VAE → GAN → Diffusion, three genuinely different approaches | 17 | advanced | ⬜ |
| 13 | Reinforcement learning | MDPs, Q-values, policy gradients — learning from rewards, not labels | 18 | advanced | ⬜ |
| 14 | Serving and distribution | TF Serving, Vertex AI, TFLite; data vs model parallelism | 19 | intermediate | ⬜ |

### Skills — what to do when you hit situation X

| # | Document | Answers the question | Ch. | Level | St |
|---|---|---|---|---|---|
| 1 | Weight initialization | Glorot, He, LeCun — chosen from the activation function, not at random | 11 | intermediate | ⬜ |
| 2 | Gradient clipping | Where to clip an exploding gradient, and when you actually need it | 11 | intermediate | ⬜ |
| 3 | Transfer learning | Which layers to freeze, when to unfreeze, what learning rate after unfreezing | 11, 14 | intermediate | ⬜ |
| 4 | Learning rate schedules | Power, exponential, piecewise, 1cycle — and which is worth trying first | 11 | intermediate | ⬜ |
| 5 | Dropout and L1/L2 | Three ways to curb overfitting, plus Monte Carlo dropout at inference | 11 | intermediate | ⬜ |
| 6 | Keras callbacks | Early stopping, checkpointing, TensorBoard — stop at the right moment and keep the model | 10 | beginner | ⬜ |
| 7 | Tuning a neural network | Keras Tuner; how many layers, how many neurons, what batch size | 10 | intermediate | ⬜ |
| 8 | Saving and restoring models | What gets saved, what gets lost, and how to load a model with custom parts | 10, 12 | beginner | ⬜ |
| 9 | Custom losses, metrics, layers | The `call`/`build`/`get_config` contract — miss one and it will not reload | 12 | advanced | ⬜ |
| 10 | Custom training loops | When `fit()` is not enough, and the price of leaving it behind | 12 | advanced | ⬜ |
| 11 | Preprocessing layers | Normalization, Discretization, StringLookup, embeddings — inside the graph, not outside | 13 | intermediate | ⬜ |
| 12 | TFRecord and protobufs | When the data has to change format, and what that costs | 13 | advanced | ⬜ |
| 13 | Text preprocessing | TextVectorization, tokenizers, and pretrained language models | 13, 16 | intermediate | ⬜ |
| 14 | Object detection and segmentation | Localization, YOLO, FCN, semantic segmentation | 14 | advanced | ⬜ |
| 15 | Time series forecasting | Windowing, the naive baseline, multi-step forecasts, seq2seq | 15 | intermediate | ⬜ |
| 16 | Stateful RNNs and masking | Carrying hidden state across batches; ignoring padding correctly | 16 | advanced | ⬜ |
| 17 | Beam search | Why greedily picking one token at a time produces bad sentences | 16 | advanced | ⬜ |
| 18 | Keeping GAN training stable | Mode collapse, generator/discriminator imbalance, progressive growing | 17 | advanced | ⬜ |
| 19 | Deep Q-learning | Replay buffer, target network, double DQN | 18 | advanced | ⬜ |
| 20 | Distribution strategies | MirroredStrategy, MultiWorker — and when adding GPUs stops helping | 19 | advanced | ⬜ |
| 21 | Shipping a model to production | TF Serving, REST vs gRPC, swapping versions without downtime | 19 | intermediate | ⬜ |

### The other three groups

| Group | Planned content |
|---|---|
| Exercises | 10 hands-on labs — Fashion-MNIST in Keras (ch10), deep-net training tricks (ch11), a custom training loop (ch12), a `tf.data` pipeline (ch13), a CNN on CIFAR (ch14), an RNN on time series (ch15), char-RNN and transformer (ch16), autoencoder + GAN (ch17), DQN on CartPole (ch18), TF Serving (ch19) |
| Cheatsheets | **Default DNN configuration** (the chapter 11 table) · Keras API · Optimizer picker · Architecture picker |
| Case studies | 9 cases — gradients vanishing in deep layers, batchnorm in the wrong place, Adam converging fast but generalising poorly, dropout left on at inference, a missing `prefetch` starving the GPU, unfreezing too early destroying pretrained weights, an RNN that only learned to repeat the last value, GAN mode collapse, preprocessing at serving time diverging from training |

Symbols: ✅ run by hand and confirmed · 📝 theory, `verified_at` still empty · ⬜ not written

## Which cheatsheet to write first

**The default DNN configuration table from chapter 11.** Géron gives a "use this when you
don't know what to use" table — He init, ReLU, Adam, early stopping. It saves more days
than any theory page in this section, because it turns *"what should I pick"* into *"do I
have a reason to deviate from the default"*.

## The numbers every lab must record

Unlike a SQL lab, results here **are not deterministic**. A note saying "accuracy 0.91"
without the four things below cannot be reproduced six months later, and the rule *"if it
hasn't run, you haven't learned it"* becomes a formality:

- the seed (`tf.random.set_seed`, `np.random.seed`)
- the `tensorflow` / `scikit-learn` versions
- whether it ran on CPU or on which GPU
- the epoch count and batch size

## Related Topics

- [Machine Learning](../index.md) — the parent topic and shared learning path
- [Foundations](../foundations/index.md) — chapters 1–9, finish those first
- [Python](../../languages/python/index.md) — NumPy, the base of tensors
