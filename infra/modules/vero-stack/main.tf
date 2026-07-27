locals {
  name_prefix    = "vero-${var.environment}"
  do_project_env = { dev = "Development", staging = "Staging", prod = "Production" }[var.environment]
  api_component  = "api"
  web_component  = "web"
}

# ---- Managed Postgres 16 (CLAUDE.md §3) ----
resource "digitalocean_database_cluster" "postgres" {
  name       = "${local.name_prefix}-pg"
  engine     = "pg"
  version    = var.postgres_version
  size       = var.postgres_size
  region     = var.region
  node_count = var.postgres_node_count
  tags       = [local.name_prefix, "vero"]
}

# ---- Managed Valkey (compatível Redis — ver nota em variables.tf) ----
resource "digitalocean_database_cluster" "valkey" {
  name       = "${local.name_prefix}-cache"
  engine     = "valkey"
  version    = var.valkey_version
  size       = var.valkey_size
  region     = var.region
  node_count = var.valkey_node_count
  tags       = [local.name_prefix, "vero"]
}

# ---- Spaces (S24/S26/S36 já documentam "upload real ao DO Spaces" como
# troca de produção pendente — esta é a peça que finalmente existe) ----
resource "digitalocean_spaces_bucket" "storage" {
  name   = "${local.name_prefix}-storage"
  region = var.region
  # Privado por padrão — tudo servido por URL assinada (padrão já usado no
  # backend p/ recibos/anexos/relatórios, S24/S26/S36/S32/S43), nunca ACL
  # pública direta no bucket.
  acl = "private"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = [var.cors_origins]
    max_age_seconds = 3000
  }
}

# ---- App Platform: 2 serviços (api NestJS + web Next.js), cada um a partir
# do próprio Dockerfile multi-stage do repo (§4 A02: não-root, base mínima).
resource "digitalocean_app" "main" {
  spec {
    name   = local.name_prefix
    region = var.app_region

    service {
      name               = local.api_component
      instance_size_slug = var.api_instance_size_slug
      instance_count     = var.api_instance_count
      http_port          = 3333
      dockerfile_path    = "apps/api/Dockerfile"

      github {
        repo           = var.github_repo
        branch         = var.git_branch
        deploy_on_push = var.deploy_on_push
      }

      health_check {
        http_path             = "/health"
        initial_delay_seconds = 20
        period_seconds        = 10
        timeout_seconds       = 5
        success_threshold     = 1
        failure_threshold     = 3
      }

      env {
        key   = "NODE_ENV"
        value = "production"
        scope = "RUN_TIME"
        type  = "GENERAL"
      }
      env {
        key   = "CORS_ORIGINS"
        value = var.cors_origins
        scope = "RUN_TIME"
        type  = "GENERAL"
      }
      env {
        key   = "DATABASE_URL"
        value = digitalocean_database_cluster.postgres.private_uri
        scope = "RUN_TIME"
        type  = "SECRET"
      }
      env {
        key   = "REDIS_URL"
        value = digitalocean_database_cluster.valkey.private_uri
        scope = "RUN_TIME"
        type  = "SECRET"
      }
      env {
        key   = "JWT_SECRET"
        value = var.jwt_secret
        scope = "RUN_TIME"
        type  = "SECRET"
      }
      env {
        key   = "ANTHROPIC_API_KEY"
        value = var.anthropic_api_key
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      dynamic "env" {
        for_each = var.extra_env
        content {
          key   = env.key
          value = env.value
          scope = "RUN_TIME"
          type  = "SECRET"
        }
      }
    }

    service {
      name               = local.web_component
      instance_size_slug = var.web_instance_size_slug
      instance_count     = var.web_instance_count
      http_port          = 3000
      dockerfile_path    = "apps/web/Dockerfile"

      github {
        repo           = var.github_repo
        branch         = var.git_branch
        deploy_on_push = var.deploy_on_push
      }

      env {
        key   = "NODE_ENV"
        value = "production"
        scope = "RUN_TIME"
        type  = "GENERAL"
      }
      env {
        # Binding nativo do App Platform: resolve p/ a URL INTERNA do
        # componente "api" dentro do mesmo app (não sai pra internet pública
        # — mais rápido e mais seguro pro tráfego servidor-a-servidor do BFF,
        # CLAUDE.md §2). CONFIRMAR na 1ª aplicação real contra a conta DO —
        # não pude validar contra a API ao vivo nesta sessão (sem token).
        key   = "API_BASE_URL"
        value = "$${${local.api_component}.PRIVATE_URL}"
        scope = "RUN_TIME"
        type  = "GENERAL"
      }
    }

    dynamic "domain" {
      for_each = var.api_domain != null ? [var.api_domain] : []
      content {
        name = domain.value
      }
    }
    dynamic "domain" {
      for_each = var.web_domain != null ? [var.web_domain] : []
      content {
        name = domain.value
      }
    }
  }
}

# ---- Agrupa tudo num Project do DO por ambiente — "ambientes separados"
# fica visível também no console, não só no state do Terraform.
resource "digitalocean_project" "this" {
  name        = local.name_prefix
  description = "Vero — ambiente ${var.environment}, provisionado 100% via Terraform (S53)."
  purpose     = "Web Application"
  environment = local.do_project_env
  resources = [
    digitalocean_database_cluster.postgres.urn,
    digitalocean_database_cluster.valkey.urn,
    digitalocean_spaces_bucket.storage.urn,
    digitalocean_app.main.urn,
  ]
}
