output "pubsub_topic_name" {
  value = google_pubsub_topic.events.name
}

output "ingestion_url" {
  value = google_cloud_run_v2_service.ingestion.uri
}
