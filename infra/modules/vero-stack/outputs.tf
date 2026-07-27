output "app_live_url" {
  description = "URL pública do app (App Platform)."
  value       = digitalocean_app.main.live_url
}

output "app_id" {
  value = digitalocean_app.main.id
}

output "postgres_host" {
  value = digitalocean_database_cluster.postgres.host
}

output "postgres_private_uri" {
  value     = digitalocean_database_cluster.postgres.private_uri
  sensitive = true
}

output "valkey_host" {
  value = digitalocean_database_cluster.valkey.host
}

output "valkey_private_uri" {
  value     = digitalocean_database_cluster.valkey.private_uri
  sensitive = true
}

output "spaces_bucket_name" {
  value = digitalocean_spaces_bucket.storage.name
}

output "spaces_bucket_endpoint" {
  value = digitalocean_spaces_bucket.storage.bucket_domain_name
}

output "project_id" {
  value = digitalocean_project.this.id
}
