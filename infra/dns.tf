module "domain" {
  source      = "github.com/kyeotic/tf-deno-domain-cloudflare"
  zone_name   = var.zone_name
  domain_name = var.domain_name
  deno_acme   = var.deno_deploy_acme
}
