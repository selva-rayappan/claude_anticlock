variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "db_subnet_group_name" { type = string }
variable "eks_node_sg_id" { type = string }
variable "db_name" { type = string; default = "opsnext" }
variable "db_username" { type = string; default = "opsnext" }
variable "instance_class" { type = string }
variable "allocated_storage_gb" { type = number; default = 100 }
variable "max_allocated_storage_gb" { type = number; default = 1000 }
variable "tags" { type = map(string); default = {} }
