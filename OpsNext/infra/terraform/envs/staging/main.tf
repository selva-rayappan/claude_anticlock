terraform {
  required_version = ">= 1.8"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "opsnext-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opsnext-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "OpsNext"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  environment = "staging"
  tags = {
    Project     = "OpsNext"
    Environment = local.environment
  }
}

module "vpc" {
  source      = "../../modules/vpc"
  environment = local.environment
  vpc_cidr    = "10.1.0.0/16"
  tags        = local.tags
}

module "rds" {
  source               = "../../modules/rds"
  environment          = local.environment
  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = module.vpc.database_subnet_group_name
  eks_node_sg_id       = module.eks.node_security_group_id
  instance_class       = "db.t3.medium"
  allocated_storage_gb = 100
  tags                 = local.tags
}

module "elasticache" {
  source             = "../../modules/elasticache"
  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id
  node_type          = "cache.t3.micro"
  tags               = local.tags
}

module "s3" {
  source      = "../../modules/s3"
  environment = local.environment
  tags        = local.tags
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "opsnext-${local.environment}"
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    general = {
      instance_types = ["t3.medium"]
      min_size       = 1
      max_size       = 3
      desired_size   = 2
    }
  }

  tags = local.tags
}

output "rds_secret_arn"        { value = module.rds.secret_arn }
output "redis_secret_arn"      { value = module.elasticache.secret_arn }
output "eks_cluster_endpoint"  { value = module.eks.cluster_endpoint }
output "eks_cluster_name"      { value = module.eks.cluster_name }
