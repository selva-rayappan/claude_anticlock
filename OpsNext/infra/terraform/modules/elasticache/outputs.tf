output "endpoint" { value = aws_elasticache_cluster.redis.cache_nodes[0].address }
output "secret_arn" { value = aws_secretsmanager_secret.redis.arn }
