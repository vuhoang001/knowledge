---
title: "Lab 8 — EC2 instance với user_data"
sidebar_position: 9
description: "aws_instance với user_data thay cho provisioner remote-exec — và cách thật để verify user_data đã lưu đúng: describe-instance-attribute, không phải describe-instances."
tags: [tutorial, terraform, aws, ec2]
domain: devops
category: tool
doc_type: tutorial
status: draft
difficulty: beginner
verified_at:
updated: 2026-10-28
---

# Lab 8 — EC2 instance với user_data

> **Chạy thật 2026-10-28** — Terraform 1.16.5, AWS provider 6.70.0, qua LocalStack.

## Đề bài

Khởi tạo một EC2 instance, cấu hình lúc boot bằng `user_data` — **không** dùng
provisioner `remote-exec`. Đây là ví dụ thật cho nguyên tắc đã nói ở
[Providers và Resources](../reference/providers-and-resources.md): ưu tiên resource/
attribute native của provider trước khi nghĩ tới provisioner.

```bash
mkdir tf-lab4 && cd tf-lab4
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

resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  user_data = <<-EOF2
    #!/bin/bash
    echo "hello from user_data" > /tmp/hello.txt
  EOF2

  tags = { Name = "lab4-web" }
}

output "instance_id" {
  value = aws_instance.web.id
}
EOF
```

> **Lấy đúng `ami` dùng cho LocalStack:** `aws --endpoint-url http://localhost:4566
> ec2 describe-images --owners amazon --query 'Images[0].ImageId' --output text` — AMI
> ID trên LocalStack chỉ là chuỗi giả lập, không phải image AMI thật như trên AWS.

## Chạy

```bash
terraform init
terraform apply -auto-approve
```

```text
Plan: 1 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + instance_id = (known after apply)
aws_instance.web: Creating...
aws_instance.web: Still creating... [00m10s elapsed]
aws_instance.web: Creation complete after 19s [id=i-592676eedacb7aaef]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

instance_id = "i-592676eedacb7aaef"
```

## Verify `user_data` đúng cách — một cạm bẫy thật

**Cách SAI** — `describe-instances` không trả `user_data` theo mặc định:

```bash
aws --endpoint-url http://localhost:4566 ec2 describe-instances \
  --instance-ids i-592676eedacb7aaef \
  --query 'Reservations[0].Instances[0].UserData'
```

```text
null
```

Đừng vội kết luận "user_data không được lưu" — đây là hành vi **đúng của chính AWS
API**: `describe-instances` không bao giờ trả `UserData`, bất kể instance có hay
không. Phải gọi đúng API khác:

**Cách ĐÚNG** — `describe-instance-attribute` với `--attribute userData`:

```bash
aws --endpoint-url http://localhost:4566 ec2 describe-instance-attribute \
  --instance-id i-592676eedacb7aaef --attribute userData
```

```json
{
    "InstanceId": "i-592676eedacb7aaef",
    "UserData": {
        "Value": "IyEvYmluL2Jhc2gKZWNobyBoZWxsbyA+IC90bXAvaGVsbG8udHh0Cg=="
    }
}
```

Giá trị trả về là **base64** (AWS luôn encode `user_data`):

```bash
echo "IyEvYmluL2Jhc2gKZWNobyBoZWxsbyA+IC90bXAvaGVsbG8udHh0Cg==" | base64 -d
```

```text
#!/bin/bash
echo hello > /tmp/hello.txt
```

> **Hạn chế của lab này trên LocalStack:** LocalStack mô phỏng EC2 API, **không chạy
> hệ điều hành thật** bên trong — `user_data` được lưu đúng và trả lại đúng (như vừa
> kiểm ở trên), nhưng *không có cách verify nó đã thực thi thật* (không SSH vào được để
> `cat /tmp/hello.txt`, vì không có máy thật nào chạy script đó). Trên AWS thật, bước
> xác minh cuối là SSH vào instance và `cat /tmp/hello.txt`.

## Dọn dẹp

```bash
terraform destroy -auto-approve
```

## Tự kiểm

1. Vì sao `user_data` được khuyến nghị hơn provisioner `remote-exec` cho việc cấu hình
   lúc boot?
2. Đổi nội dung `user_data` rồi `plan` lại — resource báo hành động gì?

<details>
<summary>Đáp án</summary>

1. `user_data` chạy bởi **chính cloud-init của instance lúc boot**, không cần Terraform
   phải SSH vào máy (không cần mở port 22, không cần quản lý SSH key trong state).
   `remote-exec` cần Terraform tự kết nối SSH/WinRM vào instance đang chạy — nhiều điểm
   có thể fail hơn (network, key, timing) và đúng như đã nói ở Providers và Resources:
   provisioner là đường cùng, không phải lựa chọn đầu tiên.
2. Chạy thật cho ra `~ update in-place` (`Plan: 0 to add, 1 to change, 0 to destroy`),
   **không** phải `-/+` — AWS provider (bản 6.70.0) coi `user_data` là attribute sửa
   tại chỗ được. Thực tế thì sửa `user_data` **không** làm nó tự chạy lại trên instance
   đang sống (cloud-init chỉ chạy đúng một lần lúc boot đầu tiên) — "update in-place"
   ở đây chỉ nghĩa là Terraform cập nhật giá trị trong state, không có tác dụng gì tới
   instance thật đang chạy. Muốn cloud-init chạy lại với nội dung mới, phải tự
   `terraform taint aws_instance.web` hoặc dùng `-replace` để buộc tạo lại.

</details>

## Related Topics

- [Providers và Resources](../reference/providers-and-resources.md) — nguyên tắc ưu tiên resource/attribute native trước provisioner
- [Lab 7 — VPC, subnet và security group](lab-07-vpc-subnet-sg.md)
- [Lab 9 — import một bucket đã tồn tại](lab-09-import-existing-bucket.md) — bài cuối
