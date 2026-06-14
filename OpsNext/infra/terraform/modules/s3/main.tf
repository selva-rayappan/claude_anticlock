terraform {
  required_providers {
    aws = { source = "hashicorp/aws"; version = "~> 5.0" }
  }
}

locals {
  buckets = {
    imports     = "opsnext-imports-${var.environment}"
    exports     = "opsnext-exports-${var.environment}"
    attachments = "opsnext-attachments-${var.environment}"
  }
}

resource "aws_s3_bucket" "buckets" {
  for_each = local.buckets
  bucket   = each.value
  tags     = var.tags
}

resource "aws_s3_bucket_versioning" "imports" {
  bucket = aws_s3_bucket.buckets["imports"].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_versioning" "attachments" {
  bucket = aws_s3_bucket.buckets["attachments"].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "buckets" {
  for_each = aws_s3_bucket.buckets

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "buckets" {
  for_each = aws_s3_bucket.buckets

  bucket = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "imports" {
  bucket = aws_s3_bucket.buckets["imports"].id

  rule {
    id     = "archive-old-imports"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years
    }
  }
}
