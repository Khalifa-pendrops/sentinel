resource "google_pubsub_topic" "events" {
  name = "sentinel-events-"
}

resource "google_pubsub_subscription" "workers" {
  name  = "sentinel-workers-"
  topic = google_pubsub_topic.events.name

  ack_deadline_seconds = 60
}
