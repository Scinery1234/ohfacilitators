/**
 * Tenant resolution utility — resolves tenant from three sources (in priority order):
 *
 *   1. Path slug:    /api/hosts/:slug (passed as `slug` param by caller)
 *   2. Subdomain:    slug.ohplaces.com  →  extract from Host header
 *   3. Custom domain: book.theirstudio.com  →  exact domain match in tenants table
 *
 * Returns the full tenant row (without sensitive integration keys) or null.
 *
 * SECURITY: Never expose stripe_account_id, cal_api_key, or twilio_number
 * in the public-facing response. The DB row is for server-side use only.
 */
import type { VercelRequest } from '@vercel/node';
import { sql } from './db.js';

export interface TenantPublic {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string;
  purposefields_opt_in: boolean;
  plan: string;
}

export interface TenantPrivate extends TenantPublic {
  stripe_account_id: string | null;
  cal_api_key: string | null;
  twilio_number: string | null;
}

const OHPLACES_APEX_DOMAINS = ['ohplaces.com', 'www.ohplaces.com', 'localhost'];

/**
 * Resolve tenant from an explicit slug string (from path param).
 */
export async function resolveTenantBySlug(slug: string): Promise<TenantPrivate | null> {
  const rows = await sql`
    SELECT id, slug, name, domain, logo_url, primary_color,
           stripe_account_id, cal_api_key, twilio_number,
           purposefields_opt_in, plan
    FROM tenants
    WHERE slug = ${slug.toLowerCase().trim()}
    LIMIT 1
  `;
  return (rows[0] as TenantPrivate) ?? null;
}

/**
 * Resolve tenant from the incoming HTTP request.
 * Checks subdomain, then custom domain, then falls back to null.
 *
 * Does NOT check path slug — callers must pass slug explicitly.
 */
export async function resolveTenantFromRequest(req: VercelRequest): Promise<TenantPrivate | null> {
  const host = (req.headers.host ?? '').split(':')[0].toLowerCase();

  if (!host) return null;

  // 1. Subdomain: <slug>.ohplaces.com
  for (const apex of OHPLACES_APEX_DOMAINS) {
    if (host !== apex && host.endsWith(`.${apex}`)) {
      const slug = host.slice(0, host.length - apex.length - 1);
      if (slug) return resolveTenantBySlug(slug);
    }
  }

  // 2. Custom domain: exact match against tenants.domain
  if (!OHPLACES_APEX_DOMAINS.includes(host)) {
    const rows = await sql`
      SELECT id, slug, name, domain, logo_url, primary_color,
             stripe_account_id, cal_api_key, twilio_number,
             purposefields_opt_in, plan
      FROM tenants
      WHERE domain = ${host}
      LIMIT 1
    `;
    return (rows[0] as TenantPrivate) ?? null;
  }

  return null;
}

/**
 * Strip sensitive fields for public-facing responses.
 */
export function toPublicTenant(t: TenantPrivate): TenantPublic {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    domain: t.domain,
    logo_url: t.logo_url,
    primary_color: t.primary_color,
    purposefields_opt_in: t.purposefields_opt_in,
    plan: t.plan,
  };
}
