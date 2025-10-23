// scripts/ingest-spring.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const STORE_SLUG = 'sgt-major-says';
const BASE_URL = `https://${STORE_SLUG}.creator-spring.com`;
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'springCatalog.json');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        accept: 'application/json,text/plain,*/*'
      }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function unescapeNextFlightString(s: string): string {
  // Unescape common JS string escapes present in Flight payloads
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function extractStoreListingFromHtml(html: string): any | null {
  // Gather all script contents; Flight pushes often span multiple scripts
  const scriptContents: string[] = [];
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    scriptContents.push(m[1]);
  }

  // Extract all Flight string payloads from self.__next_f.push([1, "..." ])
  const payloads: string[] = [];
  const flightChunkRe = /self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g;
  for (const sc of scriptContents) {
    let mm: RegExpExecArray | null;
    while ((mm = flightChunkRe.exec(sc)) !== null) {
      payloads.push(unescapeNextFlightString(mm[1]));
    }
  }

  // Search each decoded payload for a JSON object starting at "storeListing":
  for (const p of payloads) {
    const key = '"storeListing":';
    const idx = p.indexOf(key);
    if (idx === -1) continue;
    const start = idx + key.length;
    // Brace matching to capture the object
    let i = start;
    while (i < p.length && /\s/.test(p[i])) i++;
    if (p[i] !== '{') continue;
    let depth = 0;
    let inStr = false;
    let prev = '';
    for (; i < p.length; i++) {
      const ch = p[i];
      if (inStr) {
        if (ch === '"' && prev !== '\\') inStr = false;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            const jsonStr = p.slice(start, i + 1);
            try {
              return JSON.parse(jsonStr);
            } catch {
              // ignore and continue
            }
          }
        }
      }
      prev = ch;
    }
  }
  return null;
}

interface VariantRecord {
  productId: string;
  label: string;
  image: string;
  price?: string;
  springUrl: string;
  productType?: string;
  colorName?: string;
  colorHex?: string;
}

interface DesignRecord {
  slug: string;
  title: string;
  category: string;
  heroImage: string;
  variants: VariantRecord[];
  lastIndexed: string;
}

const categories: Record<string, string> = {
  apparel: '/apparel',
  accessories: '/accessories',
  drinkware: '/Drinkware',
};

const MAX_CATEGORY_PAGES = 200;

function findViewAllHref($: ReturnType<typeof load>): string | null {
  let found: string | null = null;
  $('a[href], button[data-href], button[data-url]').each((_, el) => {
    const $el = $(el);
    const text = ($el.text() || $el.attr('aria-label') || '').trim().toLowerCase();
    const hasViewAllKeyword = text.includes('view all') || text.includes('show all') || text.includes('see all');
    const testId = ($el.attr('data-testid') || '').toLowerCase();
    const isViewAllTestId = testId.includes('view-all');
    if (!hasViewAllKeyword && !isViewAllTestId) return;
    const href = $el.attr('href') || $el.attr('data-href') || $el.attr('data-url');
    if (href) {
      found = href;
      return false; // break
    }
  });
  return found;
}

async function resolveCategoryEntry(basePath: string): Promise<{
  normalizedPath: string;
  firstHtml: string;
  firstPage: number;
  firstUrl: string;
}> {
  const initialUrl = new URL(basePath, BASE_URL);
  const initialHtml = await fetchHtml(initialUrl.toString());
  const $initial = load(initialHtml);
  const viewAllHref = findViewAllHref($initial);
  if (!viewAllHref) {
    return {
      normalizedPath: basePath,
      firstHtml: initialHtml,
      firstPage: 1,
      firstUrl: initialUrl.toString(),
    };
  }

  const viewAllUrl = new URL(viewAllHref, BASE_URL);
  const firstPageParam = parseInt(viewAllUrl.searchParams.get('page') ?? '1', 10) || 1;
  const viewAllHtml = await fetchHtml(viewAllUrl.toString());

  const normalizedUrl = new URL(viewAllUrl.toString());
  normalizedUrl.searchParams.delete('page');
  const normalizedSearch = normalizedUrl.searchParams.toString();
  const normalizedPath = `${normalizedUrl.pathname}${normalizedSearch ? `?${normalizedSearch}` : ''}`;

  return {
    normalizedPath,
    firstHtml: viewAllHtml,
    firstPage: firstPageParam,
    firstUrl: viewAllUrl.toString(),
  };
}

function buildCategoryPageUrl(basePath: string, page: number): string {
  const url = new URL(basePath, BASE_URL);
  if (page <= 1) {
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', String(page));
  }
  return url.toString();
}

function normalizeSlug(href: string): string {
  try {
    const url = new URL(href, BASE_URL);
    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    return last.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  } catch {
    return href.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  }
}

function normalizeTitle(raw: string, fallbackSlug?: string): string {
  let s = (raw || '').trim();
  if (!s && fallbackSlug) s = fallbackSlug;
  if (!s) return '';

  const looksSluggy = /-|_/g.test(s)
    || /^(buy|get|new)[-\s_]/i.test(s)
    || /sgmsays/i.test(s)
    || /-\d+$/i.test(s);

  if (!looksSluggy) {
    return s.replace(/\s{2,}/g, ' ').trim();
  }

  s = s.replace(/_/g, '-');
  s = s.replace(/^(buy|get|new)[-\s_]+/i, '');
  s = s.replace(/\bsgmsays\b/gi, '');
  s = s.replace(/\bnew\b/gi, '');
  s = s.replace(/-?\d+$/i, '');
  s = s.replace(/-{2,}/g, '-');
  s = s.replace(/^-+|-+$/g, '');

  if (!s && fallbackSlug) s = fallbackSlug;
  if (!s) return '';

  s = s.replace(/-/g, ' ');
  s = s.replace(/\s{2,}/g, ' ').trim();

  const small = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'via']);
  const words = s.split(' ');
  return words
    .map((word, index) => {
      const lw = word.toLowerCase();
      if (index !== 0 && index !== words.length - 1 && small.has(lw)) {
        return lw;
      }
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(' ');
}

async function crawlCategory(catKey: string): Promise<DesignRecord[]> {
  const listings: DesignRecord[] = [];
  const seenSlugs = new Set<string>();

  const { normalizedPath, firstHtml, firstPage, firstUrl } = await resolveCategoryEntry(categories[catKey]);

  let page = firstPage;
  let consecutiveEmpty = 0;
  let firstPageConsumed = false;
  let currentPageUrl = firstUrl;

  while (page <= MAX_CATEGORY_PAGES && consecutiveEmpty < 2) {
    let html: string;
    if (!firstPageConsumed) {
      html = firstHtml;
      firstPageConsumed = true;
    } else {
      currentPageUrl = buildCategoryPageUrl(normalizedPath, page);
      html = await fetchHtml(currentPageUrl);
    }

    console.log(`[category:${catKey}] page ${page} → ${currentPageUrl}`);

    const $ = load(html);
    let foundOnPage = 0;

    $('a[href^="/listing/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const slug = normalizeSlug(href);
      if (seenSlugs.has(slug)) return;

      const title = normalizeTitle(
        $(el).find('h2, h3, .title, .product-title, p').first().text() ||
          $(el).attr('title') ||
          slug,
        slug
      );
      let image = $(el).find('img').first().attr('src') || '';
      if (!image) {
        const srcset = $(el).find('source').first().attr('srcset');
        if (srcset) image = srcset.split(',')[0]?.trim().split(' ')[0] || '';
      }
      if (!image) return;

      listings.push({
        slug,
        title,
        category: catKey,
        heroImage: new URL(image, BASE_URL).toString(),
        variants: [],
        lastIndexed: new Date().toISOString(),
      });

      seenSlugs.add(slug);
      foundOnPage++;
    });

    if (foundOnPage === 0) consecutiveEmpty += 1;
    else consecutiveEmpty = 0;

    page += 1;
    currentPageUrl = buildCategoryPageUrl(normalizedPath, page);
    await delay(500);
  }

  return listings;
}

function findProductsInNextData(nextData: unknown): any[] {
  const stack: unknown[] = [nextData];
  const products: any[] = [];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (Array.isArray(node)) {
      if (node.length && node[0] && typeof node[0] === 'object' && 'id' in node[0]) {
        products.push(...node);
      } else {
        for (const item of node) stack.push(item);
      }
    } else if (typeof node === 'object') {
      for (const value of Object.values(node as Record<string, unknown>)) stack.push(value);
    }
  }
  return products;
}

async function enrichDesign(record: DesignRecord): Promise<DesignRecord> {
  const url = `${BASE_URL}/listing/${record.slug}`;
  console.log(`  ↳ Fetch ${url}`);
  const html = await fetchHtml(url);
  const $ = load(html);

  const variants: VariantRecord[] = [];
  const seen = new Set<string>();

  const addVariant = (
    productIdRaw: string | number | null | undefined,
    label: string,
    imageUrl: string,
    price?: string,
    variationId?: string | number,
    meta?: {
      productType?: string;
      colorName?: string;
      colorHex?: string;
    }
  ) => {
    const productIdStr = productIdRaw != null && productIdRaw !== '' ? String(productIdRaw) : '';
    const variationStr = variationId != null && variationId !== '' ? String(variationId) : '';
    const colorKey = meta?.colorHex || meta?.colorName;
    const dedupeKey = variationStr
      ? `${productIdStr}:${variationStr}:${colorKey ?? ''}`
      : [productIdStr, colorKey, label].filter(Boolean).join('::');
    if (!dedupeKey || seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const variantId = variationStr || productIdStr || 'unknown';
    const normalizedImage = imageUrl ? new URL(imageUrl, BASE_URL).toString() : record.heroImage;
    const springQueryId = productIdStr || variationStr || 'unknown';
    const springUrl = springQueryId !== 'unknown'
      ? `${url}?product=${springQueryId}`
      : url;

    variants.push({
      productId: variantId,
      label,
      image: normalizedImage,
      price,
      springUrl,
      productType: meta?.productType,
      colorName: meta?.colorName,
      colorHex: meta?.colorHex,
    });
  };

  const collectStoreListingProducts = (storeListing: any): any[] => {
    if (!storeListing) return [];
    const primaryProducts = Array.isArray(storeListing.primaryProduct)
      ? storeListing.primaryProduct
      : storeListing.primaryProduct
        ? [storeListing.primaryProduct]
        : [];
    const moreProducts = Array.isArray(storeListing.moreProducts?.items)
      ? storeListing.moreProducts.items
      : Array.isArray(storeListing.moreProducts)
        ? storeListing.moreProducts
        : [];
    const relatedProducts = Array.isArray(storeListing.products) ? storeListing.products : [];
    return [...primaryProducts, ...moreProducts, ...relatedProducts];
  };

  const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
  let storeListing: any | null = null;

  if (buildIdMatch) {
    const buildId = encodeURIComponent(buildIdMatch[1]);
    const dataUrl = `${BASE_URL}/_next/data/${buildId}/listing/${record.slug}/default.json`;
    try {
      const json = await fetchJson(dataUrl);
      storeListing = json?.pageProps?.storeListing ?? json?.storeListing ?? null;
    } catch (err) {
      console.warn(`    ⚠️ Failed JSON fetch for ${record.slug}:`, err);
    }
  }

  if (!storeListing) {
    storeListing = extractStoreListingFromHtml(html);
  }

  if (storeListing) {
    const products = collectStoreListingProducts(storeListing);
    for (const prod of products) {
      if (!prod) continue;
      const productType = (prod.productType || prod.title || record.title || '').toString().trim();
      const rawColor = prod.color ?? prod.attributes?.color ?? prod.attributes?.displayColorName ?? prod.attributes?.colour;
      const colorName = typeof rawColor === 'string'
        ? rawColor
        : typeof rawColor?.name === 'string'
          ? rawColor.name
          : undefined;
      const colorHexCandidate = prod.attributes?.hex
        || prod.attributes?.colorHex
        || (typeof prod.hex === 'string' ? prod.hex : undefined)
        || (typeof prod.color === 'string' && prod.color.startsWith('#') ? prod.color : undefined);
      const colorHex = typeof colorHexCandidate === 'string' ? colorHexCandidate : undefined;

      const labelParts = [productType || record.title];
      if (colorName) labelParts.push(String(colorName));
      const label = labelParts.filter(Boolean).join(' - ').trim();
      const price = typeof prod.price === 'string'
        ? prod.price
        : typeof prod.priceUsd === 'string'
          ? prod.priceUsd
          : Array.isArray(prod.sizes) && prod.sizes[0]?.price
            ? String(prod.sizes[0].price)
            : undefined;
      const images = Array.isArray(prod.images) ? prod.images : [];
      const imageSrc = images.find((img: any) => img?.src)?.src
        || images.find((img: any) => img?.full)?.full
        || storeListing.images?.[0]?.src
        || record.heroImage;
      addVariant(
        prod.productId ?? prod.id ?? prod.teespringId ?? prod.variationId,
        label || record.title,
        imageSrc,
        price,
        prod.variationId ?? prod.teespringId ?? prod.id,
        {
          productType: productType || undefined,
          colorName: colorName?.toString().trim() || undefined,
          colorHex: colorHex?.toString().trim() || undefined,
        }
      );
    }
  }

  if (variants.length === 0) {
    const nextDataRaw = $('script#__NEXT_DATA__').first().contents().text();
    if (nextDataRaw) {
      try {
        const nextObj = JSON.parse(nextDataRaw);
        const products = findProductsInNextData(nextObj);
        for (const prod of products) {
          const label = prod.name ?? prod.title ?? record.title;
          const image = prod.image ?? prod.mockupUrl ?? prod.imageUrl ?? record.heroImage;
          const price = typeof prod.price === 'string' ? prod.price : (prod.priceUsd ?? undefined);
          addVariant(
            prod.id ?? prod.productId,
            label,
            image,
            price,
            undefined,
            {
              productType: prod.productType ?? prod.name ?? prod.title,
              colorName: prod.color ?? prod.attributes?.color,
              colorHex: prod.attributes?.hex,
            }
          );
        }
      } catch (err) {
        console.warn(`    ⚠️ Failed to parse NEXT_DATA for ${record.slug}:`, err);
      }
    }
  }

  if (variants.length === 0) {
    $('a[href*="?product="]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const full = new URL(href, BASE_URL).toString();
        const productId = new URL(full).searchParams.get('product');
        const label = ($(el).text().trim() || record.title) ?? record.title;
        addVariant(productId, label, record.heroImage);
      } catch {}
    });
  }

  if (variants.length === 0) {
    addVariant('unknown', record.title, record.heroImage);
  }

  return { ...record, variants };
}

async function main() {
  const allDesigns: DesignRecord[] = [];

  for (const cat of Object.keys(categories)) {
    const designs = await crawlCategory(cat);
    allDesigns.push(...designs);
    await delay(750);
  }

  console.log(`Found ${allDesigns.length} designs, enriching…`);
  for (let i = 0; i < allDesigns.length; i++) {
    const design = allDesigns[i];
    try {
      allDesigns[i] = await enrichDesign(design);
    } catch (err) {
      console.warn(`  ⚠️ Failed to enrich ${design.slug}:`, err);
    }
    await delay(600);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    store: STORE_SLUG,
    designs: allDesigns,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved catalog → ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
