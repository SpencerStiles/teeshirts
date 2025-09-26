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
  images?: string[]; // optional gallery
};

const STORE_SLUG = 'sgt-major-says';
const BASE_URL = `https://${STORE_SLUG}.creator-spring.com`;

// Simple in-memory cache for 5 minutes
let cache: { products: SpringProduct[]; expiresAt: number } | null = null;
let buildIdCache: { id: string; expiresAt: number } | null = null;

// Retrieve Next.js buildId for the Spring store, cached briefly
async function fetchBuildId(): Promise<string | null> {
  const now = Date.now();
  if (buildIdCache && buildIdCache.expiresAt > now) return buildIdCache.id;
  try {
    const res = await fetch(BASE_URL, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = load(html);
    const nextTxt = $('script#__NEXT_DATA__').first().contents().text();
    if (!nextTxt) return null;
    const data = JSON.parse(nextTxt);
    const id = data?.buildId ? String(data.buildId) : null;
    if (id) buildIdCache = { id, expiresAt: now + 5 * 60 * 1000 };
    return id;
  } catch {
    return null;
  }
}

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

function normalizeTitle(input: string): string {
  if (!input) return input;
  let s = String(input).trim();
  // If looks like a slug or contains known noise, normalize
  const looksSluggy = /-|_/g.test(s) || /^(buy|get)[-\s_]/i.test(s) || /sgmsays/i.test(s) || /-\d+$/i.test(s);
  if (!looksSluggy) return s;

  // Normalize separators and remove prefixes/suffixes
  s = s.replace(/_/g, '-');
  s = s.replace(/^(buy|get)[-\s_]+/i, ''); // leading buy/get-
  s = s.replace(/\bsgmsays\b/gi, ''); // drop store tag
  s = s.replace(/-?\d+$/i, ''); // trailing numeric suffixes like -7690
  s = s.replace(/-{2,}/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  // Replace hyphens with spaces
  s = s.replace(/-/g, ' ');
  s = s.replace(/\s{2,}/g, ' ').trim();

  // Title case with small words preserved
  const small = new Set(['a','an','and','as','at','but','by','for','in','nor','of','on','or','per','the','to','vs','via']);
  const words = s.split(' ');
  const titled = words.map((w, i) => {
    const lw = w.toLowerCase();
    if (i !== 0 && i !== words.length - 1 && small.has(lw)) return lw;
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(' ');
  return titled;
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
    title = normalizeTitle(title);

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

export async function fetchSpringProductDetailBySlug(slug: string): Promise<SpringProduct | null> {
  const base = await fetchSpringProductBySlug(slug);
  if (!base) return null;
  try {
    const res = await fetch(base.springUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'sec-ch-ua': '"Chromium";v="127", "Not=A?Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'upgrade-insecure-requests': '1'
      }
    });
    if (!res.ok) return base;
    const html = await res.text();
    const $ = load(html);

    const set = new Set<string>();
    const slugStr = base.slug;
    const isLikelyProductImg = (u: string) => {
      if (!u) return false;
      const url = absoluteUrl(u);
      // Filter obvious non-product assets
      if (/favicon|sprite|logo|og-image|social|share|avatar|icon|placeholder|flag/i.test(url)) return false;
      // Heuristics for Spring product media
      if (url.includes(BASE_URL) && (/listing|product|images|media|cdn/i.test(url))) return true;
      // Accept teespring/teechip/creator-spring mockup and cdn hosts
      if (/teespring|teechip|creator-spring/i.test(url) && /\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(url)) {
        // Common gallery paths: /image/, /mockup/, /images/
        if (/\/image\//i.test(url) || /mockup/i.test(url) || /\/images\//i.test(url)) return true;
      }
      if (/\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(url) && (url.includes(slugStr) || url.includes('listing') || url.includes('product'))) return true;
      return false;
    };
    const addUrl = (u?: string) => {
      if (!u) return;
      const first = u.split(',')[0]?.trim().split(' ')[0] || u;
      if (isLikelyProductImg(first)) set.add(absoluteUrl(first));
    };

    // JSON-LD product schema often contains an image or images array
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const txt = $(el).contents().text();
        const data = JSON.parse(txt);
        const arr = Array.isArray(data) ? data : [data];
        for (const obj of arr) {
          if (!obj) continue;
          const img = (obj.image ?? obj.images) as any;
          if (typeof img === 'string') addUrl(img);
          else if (Array.isArray(img)) for (const u of img) if (typeof u === 'string') addUrl(u);
        }
      } catch {}
    });

    // OpenGraph images
    $('meta[property="og:image"]').each((_, el) => addUrl($(el).attr('content') || ''));
    // Secure OG and Twitter images
    $('meta[property="og:image:secure_url"]').each((_, el) => addUrl($(el).attr('content') || ''));
    $('meta[name="twitter:image"], meta[name="twitter:image:src"]').each((_, el) => addUrl($(el).attr('content') || ''));
    // Preloaded images
    $('link[rel="preload"][as="image"]').each((_, el) => addUrl($(el).attr('href') || $(el).attr('imagesrcset') || ''));

    // Parse Next.js __NEXT_DATA__ blob (if present) and recursively collect image URLs
    const nextDataTxt = $('script#__NEXT_DATA__').first().contents().text();
    if (nextDataTxt) {
      try {
        const nextObj = JSON.parse(nextDataTxt);
        const visit = (node: any) => {
          if (!node) return;
          if (typeof node === 'string') {
            if (isLikelyProductImg(node)) set.add(absoluteUrl(node));
            return;
          }
          if (Array.isArray(node)) {
            for (const it of node) visit(it);
            return;
          }
          if (typeof node === 'object') {
            // Common fields that may hold images
            addUrl(node?.src);
            addUrl(node?.url);
            addUrl(node?.image);
            addUrl(node?.thumbnail);
            if (typeof node?.srcSet === 'string') addUrl(node.srcSet);
            if (typeof node?.srcset === 'string') addUrl(node.srcset);
            for (const k of Object.keys(node)) visit(node[k]);
          }
        };
        visit(nextObj);
      } catch {}
    }

    // Fallbacks: collect from product section first (if available), then global
    const addSrc = (u?: string) => addUrl(u);
    const addSrcset = (u?: string) => {
      if (!u) return;
      for (const part of u.split(',')) {
        const url = part.trim().split(' ')[0];
        addUrl(url);
      }
    };

    const collectFromRoot = ($root: any) => {
      // picture > source within root
      $root.find('picture source[srcset]').each((_: any, el: any) => addSrcset($(el).attr('srcset') || ''));
      // imgs within root with data-src / data-original / srcset / src; skip likely tiny icons via width/height attrs
      $root.find('img').each((_: any, el: any) => {
        const $el = $(el);
        const w = parseInt(($el.attr('width') || '').toString(), 10);
        const h = parseInt(($el.attr('height') || '').toString(), 10);
        if (w && h && (w < 200 || h < 200)) return; // skip small assets
        addSrc($el.attr('data-original') || '');
        addSrc($el.attr('data-src') || '');
        addSrcset($el.attr('srcset') || '');
        addSrc($el.attr('src') || '');
      });
    };

    // Try likely product containers first
    const candidates = [
      $('[id*="product" i]'),
      $('[class*="product" i]'),
      $('[data-testid*="product" i]'),
      $('[id*="listing" i]'),
      $('[class*="listing" i]'),
    ];
    let collectedBefore = set.size;
    for (const $c of candidates) collectFromRoot($c);
    const collectedFromProductArea = set.size > collectedBefore;

    // If nothing from product area, scan globally
    if (!collectedFromProductArea) {
      collectFromRoot($('body'));
    }

    // As a last resort, scan HTML for common image extensions
    if (set.size === 0) {
      const matches = html.match(/https?:[^\s"']+\.(?:png|jpe?g|webp|gif)(?:\?[^"'\s>]*)?/gi) || [];
      for (const m of matches) {
        if (/spring|creator-spring|images|cdn|media|listing/i.test(m) && isLikelyProductImg(m)) set.add(absoluteUrl(m));
        if (set.size > 12) break; // cap to avoid over-collecting
      }
    }

    // If we likely only captured size variants from mockup-api, try harvesting mockup IDs
    // Extract unique IDs from paths like /v3/image/<ID>/...
    const harvestMockupIds = (text: string) => {
      const ids = new Set<string>();
      const re = /\/(?:v3|api)\/image\/([A-Za-z0-9_-]+)/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (m[1]) ids.add(m[1]);
        if (ids.size > 12) break;
      }
      return Array.from(ids.values());
    };

    const mockupIds = new Set<string>();
    // From HTML
    for (const id of harvestMockupIds(html)) mockupIds.add(id);
    // From __NEXT_DATA__ JSON string, if available
    const nextDataTxt2 = $('script#__NEXT_DATA__').first().contents().text();
    if (nextDataTxt2) {
      for (const id of harvestMockupIds(nextDataTxt2)) mockupIds.add(id);
    }
    // Turn IDs into canonical 800x800 mockup URLs
    if (mockupIds.size > 0) {
      for (const id of mockupIds) {
        set.add(`https://mockup-api.teespring.com/v3/image/${id}/800/800.jpg`);
      }
    }

    // Normalize and dedupe similar variants (strip query/hash, collapse size variants)
    const getMockupId = (u: string): string | null => {
      try {
        const url = new URL(absoluteUrl(u));
        if (/mockup-api\.teespring\.com$/i.test(url.hostname)) {
          const m = url.pathname.match(/\/v3\/image\/([^\/]+)\//i);
          return m && m[1] ? m[1] : null;
        }
      } catch {}
      return null;
    };

    const toKey = (u: string) => {
      try {
        const url = new URL(absoluteUrl(u));
        // Collapse teespring mockup size variants to the base image id
        if (/mockup-api\.teespring\.com$/i.test(url.hostname)) {
          const m = url.pathname.match(/\/v3\/image\/([^\/]+)\//i);
          if (m && m[1]) {
            return `${url.origin}/v3/image/${m[1]}`;
          }
        }
        // remove query/hash for dedupe
        url.search = '';
        url.hash = '';
        // some CDNs encode size in filename or path; keep path as key
        return url.origin + url.pathname;
      } catch {
        return u;
      }
    };

    const seenKeys = new Set<string>();
    let images = Array.from(set.values()).filter((u) => {
      const k = toKey(u);
      if (seenKeys.has(k)) return false;
      seenKeys.add(k);
      return true;
    });

    // As a final filter, keep images that look like product imagery
    images = images.filter((u) => isLikelyProductImg(u));

    // Do not constrain to a single mockup family: some listings (front/back or colorways)
    // legitimately expose multiple mockup IDs. We already dedupe size variants by ID above.

    // If we still have <= 1 image, try Next.js data route for this listing
    if (images.length <= 1) {
      try {
        const buildId = await fetchBuildId();
        if (buildId) {
          const u = new URL(base.springUrl);
          const productId = u.searchParams.get('product');
          const pathSlug = base.springUrl.includes('/listing/') ? base.springUrl.split('/listing/')[1].split('?')[0] : slug;
          const dataUrl = `${BASE_URL}/_next/data/${buildId}/listing/${pathSlug}.json${productId ? `?product=${productId}` : ''}`;
          const dj = await fetch(dataUrl, {
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
              'accept': 'application/json,text/plain,*/*',
            },
          });
          if (dj.ok) {
            const json = await dj.json();
            const s = new Set<string>();
            const visit = (node: any) => {
              if (!node) return;
              if (typeof node === 'string') {
                if (isLikelyProductImg(node)) s.add(absoluteUrl(node));
                return;
              }
              if (Array.isArray(node)) { for (const it of node) visit(it); return; }
              if (typeof node === 'object') {
                const keys = Object.keys(node);
                for (const k of ['image','images','thumbnail','src','url','srcSet','srcset']) {
                  const v = (node as any)[k];
                  if (typeof v === 'string') s.add(absoluteUrl(v));
                }
                for (const k of keys) visit((node as any)[k]);
              }
            };
            visit(json);
            if (s.size > 0) {
              const added = Array.from(s.values());
              const combined = [...images, ...added];
              // normalize & dedupe again
              const seen2 = new Set<string>();
              images = combined.filter((u) => {
                const k = toKey(u);
                if (seen2.has(k)) return false;
                seen2.add(k); return true;
              }).filter((u) => isLikelyProductImg(u));
            }
          }
        }
      } catch {}
    }

    // Ensure primary image is first, avoiding duplicates by key
    if (base.image) {
      const primary = absoluteUrl(base.image);
      const primaryKey = toKey(primary);
      const seen3 = new Set<string>([primaryKey]);
      images = [primary, ...images.filter((u) => !seen3.has(toKey(u)) && seen3.add(toKey(u)) )];
    }

    // Fallback: if we still have only one image and it's a Teespring mockup,
    // synthesize one additional size variant (500x500) to give the user at least
    // two slides. This is a graceful fallback and will be replaced if we later
    // discover more real distinct mockups.
    if (images.length < 2) {
      const id = ((): string | null => {
        try {
          const url = new URL(images[0] || '');
          const m = url.pathname.match(/\/v3\/image\/([^\/]+)\//i);
          return m && m[1] ? m[1] : null;
        } catch { return null; }
      })();
      if (id) {
        const alt = `https://mockup-api.teespring.com/v3/image/${id}/500/500.jpg`;
        if (!images.includes(alt)) images.push(alt);
      }
    }

    return { ...base, images };
  } catch {
    return base;
  }
}
