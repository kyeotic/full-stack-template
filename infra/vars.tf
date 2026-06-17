#-------------------------------------------
# Required variables (do not add defaults here!)
#-------------------------------------------

#-------------------------------------------
# Configurable variables
#-------------------------------------------
variable "cloudflare_account_name" {
  default = "tim@kye.dev"
}

variable "region" {
  default = "us-west-2"
}

variable "domain_name" {
  default = "APP_TMP_ID.kye.dev"
}

variable "zone_name" {
  default = "kye.dev"
}

variable "app_name" {
  default = "APP_TMP_ID"
}

variable "cloudflare_api_token" {
  sensitive = true
}
