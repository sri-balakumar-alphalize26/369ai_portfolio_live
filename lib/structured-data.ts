import { CONTACT, OFFICES, mapsUrl, type Office } from '@/content/offices'
import { primaryCategory, type Product } from '@/lib/products'
import { SITE_URL } from '@/lib/site'

/**
 * Organization JSON-LD for the home page.
 *
 * The careers page already ships JobPosting, which is what put the roles into
 * Google Jobs. This is the other half: the entity itself, so the six offices
 * are tied to one company rather than read as six unrelated addresses, and so
 * the logo, socials and contact details can feed a knowledge panel.
 *
 * Everything here is derived from content/offices.ts and content/socials.ts —
 * the same data the footer and the contact page render — so there is no second
 * copy of the addresses to keep in step.
 */

/**
 * The address arrays are written for display, last line first-to-go: the final
 * entry is the region/country line that PostalAddress carries in its own
 * fields, so the street lines are everything before it.
 */
function postalAddress(office: Office) {
  return {
    '@type': 'PostalAddress',
    streetAddress: office.address.slice(0, -1).join(', '),
    addressLocality: office.city,
    addressCountry: office.countryCode.toUpperCase(),
  }
}

function place(office: Office) {
  return {
    '@type': 'Place',
    name: `369AI — ${office.city}`,
    address: postalAddress(office),
    // The same Maps query the office QR codes encode.
    hasMap: mapsUrl(office.mapsQuery),
    ...(office.phones?.length ? { telephone: office.phones[0] } : {}),
  }
}

/**
 * `description` is passed in rather than hardcoded so the page can hand over
 * its own translated hero copy — the same string the layout already uses for
 * the meta description.
 */
export function organizationJsonLd(description: string) {
  // Kollam is first in OFFICES and is the head office; the rest are branches.
  const [headOffice] = OFFICES

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: '369AI',
    /**
     * The brand name is contested — 369ai.cloud, 369 AI Ventures, 369 Studio
     * and several others all rank for "369 AI", and a search for "369 ai biz"
     * returns every one of them before this site.
     *
     * `name` alone is the closed-up form, so the spaced and domain forms people
     * actually type are not matched to this entity. These are the query
     * variants, not marketing copy — do not extend this into a keyword list.
     */
    alternateName: ['369 AI', '369AIbiz', '369AI Biz', '369 AI Biz', '369ai.biz'],
    url: SITE_URL,
    logo: `${SITE_URL}/images/brand/logo-369ai.png`,
    image: `${SITE_URL}/opengraph-image`,
    description,
    email: CONTACT.email,
    telephone: CONTACT.phone,
    address: postalAddress(headOffice),
    location: OFFICES.map(place),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: CONTACT.phone,
      email: CONTACT.email,
      areaServed: [...new Set(OFFICES.map((o) => o.countryCode.toUpperCase()))],
    },
    /**
     * 369AI's own channel, and only that.
     *
     * This deliberately does NOT spread SOCIALS. That list is the group's
     * shared accounts, and three of the four are branded Alphalize — the
     * Instagram is `alphalize_technologies`, the LinkedIn is
     * `company/alphalize`, and "Shan on Tech" is the channel hosting the videos
     * this site embeds. Listing them here told Google that 369AI and Alphalize
     * are one organisation, because `sameAs` asserts that *this* entity owns
     * *these* profiles.
     *
     * That merge is actively harmful now the two sites are positioned apart:
     * Alphalize owns ERP and business intelligence, 369AI owns POS, kiosks and
     * smart devices. Two sites from one operation competing for one term means
     * Google ranks one and suppresses the other, so the entities have to read
     * as distinct.
     *
     * SOCIALS itself is untouched — the footer showing the group's real
     * accounts is correct. This is the same separation the previous note here
     * drew: an entity signal is not a link for visitors.
     */
    sameAs: ['https://www.youtube.com/@369AIbiz'],
  }
}

/**
 * Product JSON-LD for the shop detail pages.
 *
 * These 75 pages published nothing at all before this — no structured data of
 * any kind — which is the largest gap on the site: they carry real model codes,
 * spec tables and photos, and a model number like NGP-MC720-S is a query this
 * site can actually win. The brand name cannot be: "369 AI" is shared with
 * 369ai.cloud and five other companies.
 *
 * NO `price`. content/products.json has no price field, so the merchant
 * rich result (price + availability) is out of reach until one exists, and
 * inventing a number to unlock it would be a lie to both Google and the
 * visitor. Everything else here is real, and the day prices land this node
 * becomes merchant-eligible with one addition.
 */
export function productJsonLd(product: Product, locale: string) {
  const url = `${SITE_URL}/${locale}/shop/${product.slug}`
  const category = primaryCategory(product)
  const specs = Object.entries(product.specs)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    description: product.description || undefined,
    // Relative in the JSON, absolute here: schema.org consumers do not resolve
    // against <base> or metadataBase the way the HTML metadata does.
    image: product.images.map((src) => `${SITE_URL}${src}`),
    /**
     * The model code is the identifier a buyer actually searches, and it is
     * embedded in the name rather than held as a field — `id` is the old Odoo
     * row number, which identifies nothing outside that export.
     */
    sku: product.id,
    mpn: product.id,
    ...(category ? { category } : {}),
    brand: { '@type': 'Brand', name: '369AI' },
    url,
    /** The spec table, which is already structured content in all but name. */
    ...(specs.length
      ? {
          additionalProperty: specs.map(([name, value]) => ({
            '@type': 'PropertyValue',
            name,
            value,
          })),
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url,
      availability: 'https://schema.org/InStock',
      // Points at the Organization node the home page defines, so the whole
      // site describes one company rather than 75 unrelated sellers.
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  }
}

/**
 * BreadcrumbList — the one node here that Google renders visibly, replacing the
 * raw URL in the result with a readable trail.
 *
 * `trail` is ordered root-first and each `path` is locale-relative (''
 * for the locale home), so callers cannot accidentally emit the English URL on
 * a translated page — the mistake that is live on the Alphalize site, where the
 * services ItemList drops the locale and all nine locales advertise /en.
 */
export function breadcrumbJsonLd(locale: string, trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}/${locale}${crumb.path}`,
    })),
  }
}

/**
 * ItemList for the shop listing.
 *
 * `locale` is a required parameter and every URL is built from it, which is the
 * whole point: the equivalent list on the Alphalize site hardcodes the origin
 * and omits the locale, so all nine of its locales publish the English URL. The
 * signature here makes that mistake impossible to repeat by accident.
 */
export function shopItemListJsonLd(
  locale: string,
  products: { slug: string; name: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '369AI hardware',
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: product.name,
      url: `${SITE_URL}/${locale}/shop/${product.slug}`,
    })),
  }
}
