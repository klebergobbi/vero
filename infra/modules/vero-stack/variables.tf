variable "environment" {
  description = "Nome do ambiente (dev, staging ou prod) — usado em nomes de recursos e no Project do DO."
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment deve ser \"dev\", \"staging\" ou \"prod\"."
  }
}

variable "region" {
  description = "Região do DigitalOcean p/ banco de dados e Spaces (slugs tipo nyc3, sfo3)."
  type        = string
  default     = "nyc3"
}

variable "app_region" {
  description = "Região do App Platform (slug curto, tipo nyc — pode diferir do slug de região do banco/Spaces)."
  type        = string
  default     = "nyc"
}

# ---- Managed Postgres ----

variable "postgres_version" {
  type    = string
  default = "16" # CLAUDE.md §3: PostgreSQL 16
}

variable "postgres_size" {
  description = "Slug do tamanho do cluster Postgres (ex.: db-s-1vcpu-1gb)."
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "postgres_node_count" {
  type    = number
  default = 1
}

# ---- Managed Valkey (compatível com Redis; DO descontinuou "Redis" como
# produto gerenciado novo — Valkey é o fork drop-in-compatible que substituiu.
# CLAUDE.md §3 ainda diz "Redis 7": desvio documentado, mesmo padrão da ADR
# do Next 15 (S7a) — o cliente ioredis/BullMQ do projeto fala o protocolo
# Redis normalmente contra um servidor Valkey, sem mudança de código. ----

variable "valkey_version" {
  type    = string
  default = "8"
}

variable "valkey_size" {
  type    = string
  default = "db-s-1vcpu-1gb"
}

variable "valkey_node_count" {
  type    = number
  default = 1
}

# ---- App Platform ----

variable "github_repo" {
  description = "Repo GitHub no formato owner/repo."
  type        = string
  default     = "klebergobbi/vero"
}

variable "git_branch" {
  type    = string
  default = "main"
}

variable "deploy_on_push" {
  description = "Redeploy automático a cada push na branch (normalmente true só p/ o ambiente de dev)."
  type        = bool
  default     = false
}

variable "api_instance_size_slug" {
  type    = string
  default = "basic-xxs"
}

variable "api_instance_count" {
  type    = number
  default = 1
}

variable "web_instance_size_slug" {
  type    = string
  default = "basic-xxs"
}

variable "web_instance_count" {
  type    = number
  default = 1
}

variable "cors_origins" {
  description = "Valor de CORS_ORIGINS pro backend (URL pública do web deste ambiente)."
  type        = string
}

variable "api_domain" {
  description = "Domínio customizado da API (opcional — sem domínio próprio confirmado ainda, §0 do CLAUDE.md)."
  type        = string
  default     = null
}

variable "web_domain" {
  description = "Domínio customizado do web (opcional)."
  type        = string
  default     = null
}

# ---- Segredos (§4 — nunca hardcoded; vêm de terraform.tfvars não commitado) ----

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "anthropic_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "extra_env" {
  description = "Env vars adicionais (integrações opcionais: Evolution/Asaas/NFS-e/SPC/etc.) aplicadas como SECRET em ambos os componentes. Chave = nome da env var."
  type        = map(string)
  sensitive   = true
  default     = {}
}
