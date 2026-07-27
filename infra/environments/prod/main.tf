terraform {
  required_version = ">= 1.9.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.96"
    }
  }
}

provider "digitalocean" {
  token = var.do_token

  spaces_access_id  = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
}

module "stack" {
  source = "../../modules/vero-stack"

  environment = "prod"
  region      = var.region
  app_region  = var.app_region

  # Ainda modesto (MVP, CLAUDE.md §1) — sem standby node/HA de banco por
  # padrão, pra não inflar custo antes de haver tráfego real. Reavaliar
  # node_count=2 (HA) quando o negócio justificar.
  postgres_size       = "db-s-1vcpu-2gb"
  postgres_node_count = 1
  valkey_size         = "db-s-1vcpu-1gb"
  valkey_node_count   = 1

  api_instance_size_slug = "basic-xs"
  api_instance_count     = 2 # >1 réplica: sem downtime de deploy, §1 "zero downtime"
  web_instance_size_slug = "basic-xs"
  web_instance_count     = 2

  github_repo    = var.github_repo
  git_branch     = var.git_branch
  deploy_on_push = false # produção SEMPRE promovida deliberadamente

  cors_origins = var.cors_origins
  api_domain   = var.api_domain
  web_domain   = var.web_domain

  jwt_secret        = var.jwt_secret
  anthropic_api_key = var.anthropic_api_key
  extra_env         = var.extra_env
}
