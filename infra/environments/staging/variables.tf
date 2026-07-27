variable "do_token" {
  type      = string
  sensitive = true
}

variable "spaces_access_id" {
  type      = string
  sensitive = true
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

variable "git_branch" {
  description = "Branch que a staging acompanha (promoção deliberada — não necessariamente main)."
  type        = string
  default     = "main"
}

variable "cors_origins" {
  type = string
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
