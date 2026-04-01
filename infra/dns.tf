data "cloudflare_zone" "domain" {
  name = var.zone_name
}

resource "cloudflare_workers_domain" "app" {
  account_id = local.cloudflare_account_id
  hostname   = var.domain_name
  service    = var.app_name
  zone_id    = data.cloudflare_zone.domain.id
}
