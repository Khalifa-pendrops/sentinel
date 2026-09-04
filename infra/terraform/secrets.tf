resource "google_secret_manager_secret" "database_url" {
  secret_id = "sentinel-database-url-"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "api_key_salt" {
  secret_id = "sentinel-api-key-salt-"

  replication {
    auto {}
  }
}
