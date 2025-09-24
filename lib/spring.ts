import { load } from 'cheerio';
// Minimal File polyfill for Node 18 SSR. Next/undici may reference global File.
// This is sufficient for type/shape checks; it doesn't change runtime behavior otherwise.
if (typeof (globalThis as any).File === 'undefined') {
  class PolyfillFile extends Blob {
    name: string;
    lastModified: number;
    constructor(fileBits: any[], fileName: string, options: any = {}) {
      super(fileBits as any, options);
      this.name = String(fileName);
      this.lastModified = options?.lastModified ?? Date.now();
    }
    get [Symbol.toStringTag]() {
      return 'File';
    }
  }
  (globalThis as any).File = PolyfillFile as unknown as typeof File;
}

export type SpringProduct = {
  slug: string; // normalized last path segment or derived from href
  title: string;
  image: string; // absolute URL
  springUrl: string; // absolute URL
  price?: string;
};

const STORE_SLUG = 'sgt-major-says';
const BASE_URL = `https://${STORE_SLUG}.creator-spring.com`;

// Simple in-memory cache for 5 minutes
let cache: { products: SpringProduct[]; expiresAt: number } | null = null;

function absoluteUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return BASE_URL + url;
  return url;
}

function deriveSlugFromHref(href: string): string {
  try {
    const u = new URL(absoluteUrl(href));
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || parts[parts.length - 2] || 'item';
    return last.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  } catch {
    return href.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  }
}

async function fetchPage(page: number): Promise<SpringProduct[]> {
  const res = await fetch(`${BASE_URL}/?page=${page}`, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; SGTMajorBot/1.0; +https://example.com)'
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = load(html);

  const items = new Map<string, SpringProduct>();

  $('a[href^="/listing/"]').each((_: number, el: any) => {
    const href = $(el).attr('href') || '';
    const springUrl = absoluteUrl(href);
    const slug = deriveSlugFromHref(href);

    // Find title and image within the anchor or its container
    let title = $(el).find('h2, h3, .title, .product-title, p').first().text().trim();
    if (!title) title = $(el).attr('title') || slug;

    // Image selection fallbacks
    let img = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src') || '';
    if (!img) {
      const srcset = $(el).find('source').first().attr('srcset') || '';
      if (srcset) img = srcset.split(',')[0]?.trim().split(' ')[0] || '';
    }
    const image = absoluteUrl(img);

    items.set(slug, { slug, title, image, springUrl });
  });

  return Array.from(items.values());
}

export async function fetchSpringProducts(maxPages = 3): Promise<SpringProduct[]> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.products;

  const all: SpringProduct[] = [];
  const seen = new Set<string>();
  for (let p = 1; p <= maxPages; p++) {
    const pageItems = await fetchPage(p);
    let added = 0;
    for (const it of pageItems) {
      if (seen.has(it.slug)) continue;
      seen.add(it.slug);
      all.push(it);
      added++;
    }
    if (added === 0) break; // stop when no new items
  }

  cache = { products: all, expiresAt: now + 5 * 60 * 1000 };
  return all;
}

export async function fetchSpringProductBySlug(slug: string): Promise<SpringProduct | null> {
  const list = await fetchSpringProducts();
  const exact = list.find((p) => p.slug === slug);
  if (exact) return exact;
  // Fallback: partial match
  const partial = list.find((p) => p.slug.includes(slug) || slug.includes(p.slug));
  return partial || null;
}

export function getStoreSlug() {
  return STORE_SLUG;
}
