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

  environment = "staging"
  region      = var.region
  app_region  = var.app_region

  postgres_size       = "db-s-1vcpu-1gb"
  postgres_node_count = 1
  valkey_size         = "db-s-1vcpu-1gb"
  valkey_node_count   = 1

  api_instance_size_slug = "basic-xxs"
  api_instance_count     = 1
  web_instance_size_slug = "basic-xxs"
  web_instance_count     = 1

  github_repo    = var.github_repo
  git_branch     = var.git_branch
  deploy_on_push = false # staging é promovido deliberadamente, não a cada push

  cors_origins = var.cors_origins

  jwt_secret        = var.jwt_secret
  anthropic_api_key = var.anthropic_api_key
  extra_env         = var.extra_env
}
