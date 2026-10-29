---
title: "Lab 7 — VPC, subnet và security group"
i18n_status: untranslated
sidebar_position: 8
description: "Một VPC, nhiều subnet dựng bằng for_each trên map CIDR, và một security group với ingress rule — nối trực tiếp kỹ năng count vs for_each vào hạ tầng mạng thật."
tags: [tutorial, terraform, aws, vpc, networking]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: intermediate
verified_at:
updated: 2026-10-28
---

# Lab 7 — VPC, subnet và security group

> **Chạy thật 2026-10-28** — Terraform 1.16.5, AWS provider 6.70.0, qua LocalStack.

## Đề bài

Một VPC `10.20.0.0/16`, hai subnet (`public-a`, `private-a`) tạo bằng `for_each` trên
map tên→CIDR (áp dụng [`count` vs `for_each`](../skills/count-vs-for-each.md)), và một
security group mở `80` cho mọi nơi, `22` chỉ trong VPC.

```bash
mkdir tf-lab3 && cd tf-lab3
cat > main.tf << 'EOF'
variable "localstack_endpoint" {
  type    = string
  default = "http://localhost:4566"
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    ec2 = var.localstack_endpoint
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.20.0.0/16"
  tags       = { Name = "lab3-vpc" }
}

variable "subnets" {
  type = map(string)
  default = {
    public-a  = "10.20.1.0/24"
    private-a = "10.20.2.0/24"
  }
}

resource "aws_subnet" "this" {
  for_each          = var.subnets
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = "us-east-1a"
  tags              = { Name = each.key }
}

resource "aws_security_group" "web" {
  name   = "lab3-web-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH noi bo"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.20.0.0/16"]
  }
}

output "subnet_ids" {
  value = { for k, s in aws_subnet.this : k => s.id }
}
EOF
```

## Chạy

```bash
terraform init
terraform apply -auto-approve
```

```text
aws_vpc.main: Creating...
aws_vpc.main: Creation complete after 1s [id=vpc-7e2a714d]
aws_subnet.this["private-a"]: Creating...
aws_security_group.web: Creating...
aws_subnet.this["public-a"]: Creating...
aws_subnet.this["public-a"]: Creation complete after 0s [id=subnet-8fdb4c73]
aws_subnet.this["private-a"]: Creation complete after 0s [id=subnet-6ba4343e]
aws_security_group.web: Creation complete after 0s [id=sg-751652aca603474ed]

Apply complete! Resources: 4 added, 0 changed, 0 destroyed.

Outputs:

subnet_ids = {
  "private-a" = "subnet-6ba4343e"
  "public-a" = "subnet-8fdb4c73"
}
```

Chú ý thứ tự: `aws_subnet.this["private-a"]` tạo **trước** `public-a` trong log — vì cả
hai không phụ thuộc nhau, Terraform tạo song song, thứ tự log không phản ánh thứ tự
trong `for_each`.

## Verify bằng AWS CLI

```bash
aws --endpoint-url http://localhost:4566 ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-7e2a714d" \
  --query 'Subnets[].{Id:SubnetId,Cidr:CidrBlock}'
```

```json
[
    { "Id": "subnet-6ba4343e", "Cidr": "10.20.2.0/24" },
    { "Id": "subnet-8fdb4c73", "Cidr": "10.20.1.0/24" }
]
```

```bash
aws --endpoint-url http://localhost:4566 ec2 describe-security-groups \
  --group-ids sg-751652aca603474ed --query 'SecurityGroups[0].IpPermissions'
```

```json
[
    { "IpProtocol": "tcp", "FromPort": 80, "ToPort": 80,
      "IpRanges": [{ "Description": "HTTP", "CidrIp": "0.0.0.0/0" }] },
    { "IpProtocol": "tcp", "FromPort": 22, "ToPort": 22,
      "IpRanges": [{ "Description": "SSH noi bo", "CidrIp": "10.20.0.0/16" }] }
]
```

## Dọn dẹp

```bash
terraform destroy -auto-approve
```

## Tự kiểm

1. Thêm một subnet thứ ba `public-b = "10.20.3.0/24"` vào `var.subnets` — `plan` báo
   gì cho `public-a` và `private-a`?
2. Security group dùng `ingress` block **inline** (viết ngay trong resource). Nếu một
   người khác thêm rule bằng tay qua console (ngoài Terraform), lần `plan` tiếp theo sẽ
   nói gì — nhớ lại [State](../reference/state.md) phần drift detection?

<details>
<summary>Đáp án</summary>

1. Không gì cả — `Plan: 1 to add, 0 to change, 0 to destroy`, chỉ `public-b` được tạo
   thêm. Đây chính là lợi ích đã thấy ở [`count` vs `for_each`](../skills/count-vs-for-each.md):
   thêm/xoá một key trong map không đụng tới các key khác.
2. `plan` sẽ báo `~ update in-place` cho `aws_security_group.web`, vì với `ingress`
   block viết inline, Terraform **quản lý toàn bộ danh sách rule** như một khối — rule
   thêm tay bị coi là "không có trong config" và `plan` sẽ đề xuất **xoá nó** để khớp
   lại với HCL (drift detection, đúng cơ chế đã học ở State — Terraform không phân biệt
   "ai thêm rule đó", nó chỉ thấy thực tế khác config).

</details>

## Related Topics

- [`count` vs `for_each`](../skills/count-vs-for-each.md) — lý thuyết cho `for_each` trên subnet
- [State](../reference/state.md) — drift detection khi ai đó sửa security group bằng tay
- [Lab 6 — IAM role và policy](lab-06-iam-role-policy.md)
- [Lab 8 — EC2 instance](lab-08-ec2-instance.md) — bài tiếp theo, dùng lại VPC kiểu này
