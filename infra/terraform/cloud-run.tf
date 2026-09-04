resource "google_cloud_run_v2_service" "ingestion" {
  name     = "sentinel-ingestion-"
  location = var.gcp_region

  template {
    containers {
      image = "gcr.io//sentinel-ingestion:latest"
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}

resource "google_cloud_run_v2_service" "workers" {
  name     = "sentinel-workers-"
  location = var.gcp_region

  template {
    containers {
      image = "gcr.io//sentinel-workers:latest"
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}
