---
title: Cấu trúc một dbt project
description: dbt_project.yml, profiles.yml, target/compiled — thư mục nào chứa gì.
tags: [dbt, configuration, project-structure]
domain: data-engineering
category: technology
status: draft
difficulty: beginner
verified_at:
updated: 2026-07-31
---
# Cấu trúc một dbt project

> **Chốt (cần kiểm chứng):** `dbt_project.yml` mô tả *dự án*, `profiles.yml` mô tả
> *chỗ kết nối tới*. Tách đôi vì dự án đi vào git, còn thông tin kết nối thì không.

## Cần trả lời

- [ ] Thư mục nào bắt buộc, thư mục nào tuỳ chọn
- [ ] `dbt_project.yml` khai gì — `models:` config theo tầng ra sao
- [ ] `profiles.yml` ở đâu (`~/.dbt/` vs `--profiles-dir .`), vì sao **không** commit
- [ ] `target/` chứa gì: `compiled/` vs `run/` khác nhau chỗ nào
- [ ] `dbt_packages/`, `logs/` — có nên `.gitignore` không

## Khung thư mục

```
dbt_lab/
├── dbt_project.yml        cấu hình dự án — vào git
├── profiles.yml           thông tin kết nối — KHÔNG vào git
├── packages.yml           gói ngoài (dbt_utils)
├── models/                nơi viết SQL
│   ├── staging/
│   ├── marts/
│   └── schema.yml         khai test + mô tả cột
├── seeds/                 CSV nhỏ
├── snapshots/             SCD2
├── macros/                hàm Jinja
├── tests/                 singular test
└── target/                dbt SINH RA — đọc, không sửa
    ├── compiled/          SQL sau khi render Jinja  ← nơi đi tìm lỗi
    └── run/               SQL kèm câu bọc create table/view
```

## Ghi khi đã chạy

<!-- Dán output thật vào đây. Chưa có output thì file này chưa đáng tin. -->

## Liên kết

- [Mục lục dbt](index.md)
- [dbt là gì](what-is-dbt.md) §2 — vì sao `target/compiled/` là chỗ quan trọng nhất
