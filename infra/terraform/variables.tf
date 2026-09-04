variable "gcp_project_id" {
  type        = string
  description = "GCP project ID Sentinel infra deploys into"
}

variable "gcp_region" {
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  type        = string
  default     = "dev"
}
