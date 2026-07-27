variable "do_token" {
  description = "API token do DigitalOcean (Generate New Token, escopo read+write). NUNCA commitar — só em terraform.tfvars local."
  type        = string
  sensitive   = true
}

variable "spaces_access_id" {
  description = "Chave de acesso do Spaces (API compatível S3 — distinta do do_token). Gerar em Spaces > Access Keys."
  type        = string
  sensitive   = true
}

variable "spaces_secret_key" {
  type      = string
  sensitive = true
}

variable "region" {
  type    = string
  default = "nyc3"
}

variable "app_region" {
  type    = string
  default = "nyc"
}

variable "github_repo" {
  type    = string
  default = "klebergobbi/vero"
}

variable "cors_origins" {
  description = "URL pública do web deste ambiente (ex.: https://vero-dev-xxxxx.ondigitalocean.app antes de ter domínio próprio)."
  type        = string
}

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
  type      = map(string)
  sensitive = true
  default   = {}
}
