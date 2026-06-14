terraform {
  required_providers {
    aws    = { source = "hashicorp/aws"; version = "~> 5.0" }
    random = { source = "hashicorp/random"; version = "~> 3.0" }
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "redis" {
  name                    = "opsnext/${var.environment}/redis"
  recovery_window_in_days = 7
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    host       = aws_elasticache_cluster.redis.cache_nodes[0].address
    port       = 6379
    auth_token = random_password.redis_auth_token.result
  })
}

resource "aws_security_group" "redis" {
  name   = "opsnext-redis-${var.environment}"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.eks_node_sg_id]
  }

  tags = var.tags
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "opsnext-redis-${var.environment}"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "opsnext-${var.environment}"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  snapshot_retention_limit = 7
  snapshot_window          = "03:00-04:00"

  tags = var.tags
}
