output "endpoint" { value = aws_db_instance.postgres.address }
output "port" { value = aws_db_instance.postgres.port }
output "secret_arn" { value = aws_secretsmanager_secret.db_credentials.arn }
