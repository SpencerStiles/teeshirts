// scripts/ingest-spring.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const STORE_SLUG = 'sgt-major-says';
const BASE_URL = `https://${STORE_SLUG}.creator-spring.com`;
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'springCatalog.json');

// Rate limiting configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 60000;
const BATCH_SIZE = 2; // Reduced from 5 to avoid rate limiting
const BATCH_DELAY_MS = 1500; // Delay between batches
const REQUEST_DELAY_MS = 500; // Delay between individual requests in enrichment

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function categorizeByProductType(productType: string): string {
  const type = productType.toLowerCase();
  
  // Drinkware
  if (type.includes('mug') || type.includes('bottle') || type.includes('tumbler') || 
      type.includes('cup') || type.includes('flask')) {
    return 'drinkware';
  }
  
  // Accessories
  if (type.includes('hat') || type.includes('cap') || type.includes('beanie') || 
      type.includes('snapback') || type.includes('trucker') ||
      type.includes('bag') || type.includes('tote') || type.includes('backpack') ||
      type.includes('sticker') || type.includes('phone case') || type.includes('keychain')) {
    return 'accessories';
  }
  
  // Everything else is apparel (shirts, hoodies, pants, etc.)
  return 'apparel';
}

async function fetchJson(url: string, retryCount = 0): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        accept: 'application/json,text/plain,*/*'
      }
    });
    
    if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
      if (retryCount >= MAX_RETRIES) return null;
      const backoffDelay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      );
      await delay(backoffDelay);
      return fetchJson(url, retryCount + 1);
    }
    
    if (!res.ok) return null;
    return await res.json();
  } catch {
    if (retryCount >= MAX_RETRIES) return null;
    const backoffDelay = Math.min(
      INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
      MAX_RETRY_DELAY_MS
    );
    await delay(backoffDelay);
    return fetchJson(url, retryCount + 1);
  }
}

async function fetchHtml(url: string, retryCount = 0): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    });
    
    if (res.status === 429) {
      // Rate limited - apply exponential backoff
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries: ${url}`);
      }
      const backoffDelay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      );
      console.log(`    ⏳ Rate limited (429), waiting ${backoffDelay / 1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await delay(backoffDelay);
      return fetchHtml(url, retryCount + 1);
    }
    
    if (res.status >= 500 && res.status < 600) {
      // Server error - retry with backoff
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`Server error ${res.status} after ${MAX_RETRIES} retries: ${url}`);
      }
      const backoffDelay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      );
      console.log(`    ⏳ Server error (${res.status}), waiting ${backoffDelay / 1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await delay(backoffDelay);
      return fetchHtml(url, retryCount + 1);
    }
    
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
  } catch (err: any) {
    // Network errors - retry with backoff
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`Network error after ${MAX_RETRIES} retries: ${url} - ${err.message}`);
      }
      const backoffDelay = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      );
      console.log(`    ⏳ Network error, waiting ${backoffDelay / 1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await delay(backoffDelay);
      return fetchHtml(url, retryCount + 1);
    }
    throw err;
  }
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

// Main categories to crawl
const categories: Record<string, string> = {
  // Main categories
  all: '/',  // Start with the main explore page
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

interface CategoryEntry {
  normalizedPath: string;
  firstHtml: string;
  firstPage: number;
  firstUrl: string;
  title: string;
  isSubcategory: boolean;
}

async function resolveCategoryEntry(
  basePath: string,
  isSubcategory: boolean = false,
  parentTitle: string = ''
): Promise<CategoryEntry[]> {
  const results: CategoryEntry[] = [];
  
  try {
    const initialUrl = new URL(basePath, BASE_URL);
    console.log(`Fetching category: ${initialUrl.toString()}`);
    const initialHtml = await fetchHtml(initialUrl.toString());
    const $initial = load(initialHtml);

    // If this is a main category page, look for subcategories first
    if (!isSubcategory) {
      // Look for subcategory sections
      $initial('.category-section, .product-grid-container, section').each((_, section) => {
        const $section = $initial(section);
        const sectionTitle = $section.find('h2, h3, .section-title').first().text().trim() || 'Other';
        
        // Look for view all buttons in this section
        const $viewAll = $section.find('a:contains("View All"), a:contains("view all"), button:contains("View All")').first();
        if ($viewAll.length > 0) {
          const href = $viewAll.attr('href') || $viewAll.attr('data-href') || '';
          if (href) {
            const fullHref = new URL(href, BASE_URL).toString();
            console.log(`  Found subcategory: ${sectionTitle} → ${fullHref}`);
            // Don't await here, we'll process them in sequence later
            results.push({
              normalizedPath: href,
              firstHtml: '', // Will be fetched when processed
              firstPage: 1,
              firstUrl: fullHref,
              title: `${parentTitle ? parentTitle + ' › ' : ''}${sectionTitle}`,
              isSubcategory: true
            });
          }
        }
      });
    }

    // Process the current category
    const viewAllHref = findViewAllHref($initial);
    if (viewAllHref) {
      const viewAllUrl = new URL(viewAllHref, BASE_URL);
      const firstPageParam = parseInt(viewAllUrl.searchParams.get('page') ?? '1', 10) || 1;
      
      // Only fetch the view-all page if it's different from the current page
      if (viewAllUrl.pathname !== initialUrl.pathname || 
          viewAllUrl.search !== initialUrl.search) {
        console.log(`  Found view-all link: ${viewAllUrl.toString()}`);
        const viewAllHtml = await fetchHtml(viewAllUrl.toString());
        
        const normalizedUrl = new URL(viewAllUrl.toString());
        normalizedUrl.searchParams.delete('page');
        const normalizedSearch = normalizedUrl.searchParams.toString();
        const normalizedPath = `${normalizedUrl.pathname}${normalizedSearch ? `?${normalizedSearch}` : ''}`;
        
        results.push({
          normalizedPath,
          firstHtml: viewAllHtml,
          firstPage: firstPageParam,
          firstUrl: viewAllUrl.toString(),
          title: parentTitle || basePath,
          isSubcategory
        });
      } else {
        // No separate view-all page, use current page
        results.push({
          normalizedPath: basePath,
          firstHtml: initialHtml,
          firstPage: 1,
          firstUrl: initialUrl.toString(),
          title: parentTitle || basePath,
          isSubcategory
        });
      }
    } else {
      // No view-all link, use current page
      results.push({
        normalizedPath: basePath,
        firstHtml: initialHtml,
        firstPage: 1,
        firstUrl: initialUrl.toString(),
        title: parentTitle || basePath,
        isSubcategory
      });
    }
  } catch (error) {
    console.error(`Error resolving category ${basePath}:`, error);
  }
  
  return results;
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
    let slug = last.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    
    // Don't include product ID - we want to group all variants under one design
    // The product ID differentiates product types (t-shirt, hoodie, etc.) not unique designs
    
    return slug;
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
  
  // Remove (product) suffix and similar artifacts
  s = s.replace(/\s*\(product\)\s*/gi, '');
  s = s.replace(/\s*\[product\]\s*/gi, '');
  s = s.trim();

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

async function crawlCategoryPage(
  entry: CategoryEntry,
  seenSlugs: Set<string>,
  catKey: string
): Promise<DesignRecord[]> {
  const listings: DesignRecord[] = [];
  let page = entry.firstPage;
  let consecutiveEmpty = 0;
  let firstPageConsumed = false;
  let currentPageUrl = entry.firstUrl;

  while (page <= MAX_CATEGORY_PAGES && consecutiveEmpty < 2) {
    let html: string;
    
    try {
      if (!firstPageConsumed && entry.firstHtml) {
        html = entry.firstHtml;
        firstPageConsumed = true;
      } else {
        currentPageUrl = buildCategoryPageUrl(entry.normalizedPath, page);
        console.log(`  [${entry.title}] Page ${page} → ${currentPageUrl}`);
        html = await fetchHtml(currentPageUrl);
        await delay(1500); // Be gentle to avoid 500 errors
      }

      const $ = load(html);
      let foundOnPage = 0;

      // Look for product links
      $('a[href^="/listing/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        
        // Extract product parameter from query string
        let productParam: string | null = null;
        try {
          const url = new URL(href, BASE_URL);
          productParam = url.searchParams.get('product');
        } catch {
          // ignore
        }
        
        let slug = normalizeSlug(href);
        
        // If there's a product param, append it to the slug to create unique identifiers
        // This is important for pages like mugs where ?product=1565 is the mug variant
        if (productParam) {
          slug = `${slug}-${productParam}`;
        }
        
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

      if (foundOnPage === 0) {
        consecutiveEmpty += 1;
        console.log(`  No products found on page ${page}`);
      } else {
        console.log(`  Found ${foundOnPage} products on page ${page}`);
        consecutiveEmpty = 0;
      }
    } catch (error) {
      console.error(`  Error processing page ${page}:`, error);
      consecutiveEmpty += 1;
    }

    page += 1;
  }

  return listings;
}

async function crawlCategory(catKey: string): Promise<DesignRecord[]> {
  const listings: DesignRecord[] = [];
  const seenSlugs = new Set<string>();
  const categoryPath = categories[catKey];
  
  console.log(`\n=== Starting crawl of category: ${catKey} (${categoryPath}) ===`);
  
  // First, get the main category entries
  const mainEntries = await resolveCategoryEntry(categoryPath, false, catKey);
  
  // Process each entry (main category + subcategories)
  for (const entry of mainEntries) {
    console.log(`\nProcessing ${entry.isSubcategory ? 'subcategory' : 'category'}: ${entry.title}`);
    
    // If this is a subcategory, we might need to resolve it further
    if (entry.isSubcategory && !entry.firstHtml) {
      const subEntries = await resolveCategoryEntry(entry.normalizedPath, true, entry.title);
      
      for (const subEntry of subEntries) {
        const subListings = await crawlCategoryPage(subEntry, seenSlugs, catKey);
        listings.push(...subListings);
      }
    } else {
      // Process the main category or already resolved subcategory
      const categoryListings = await crawlCategoryPage(entry, seenSlugs, catKey);
      listings.push(...categoryListings);
    }
  }
  
  console.log(`\n=== Finished crawl of ${catKey}: Found ${listings.length} unique products ===`);
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
  // Extract base slug and product ID if present
  const slugParts = record.slug.match(/^(.+?)-(\d+)$/);
  const baseSlug = slugParts ? slugParts[1] : record.slug;
  const productId = slugParts ? slugParts[2] : null;
  
  const url = productId 
    ? `${BASE_URL}/listing/${baseSlug}?product=${productId}`
    : `${BASE_URL}/listing/${baseSlug}`;
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
    const dataUrl = `${BASE_URL}/_next/data/${buildId}/listing/${baseSlug}/default.json`;
    try {
      const json = await fetchJson(dataUrl);
      storeListing = json?.pageProps?.storeListing ?? json?.storeListing ?? null;
    } catch (err) {
      console.warn(`    ⚠️ Failed JSON fetch for ${baseSlug}:`, err);
    }
  }

  if (!storeListing) {
    storeListing = extractStoreListingFromHtml(html);
  }

  if (storeListing) {
    const products = collectStoreListingProducts(storeListing);
    console.log(`    Found ${products.length} products in storeListing for ${record.slug}`);
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

  console.log(`    → Collected ${variants.length} variants for ${record.slug}`);
  return { ...record, variants };
}

async function main() {
  const allDesigns: DesignRecord[] = [];
  const seenSlugs = new Set<string>();
  
  // Load existing catalog to avoid re-fetching items we already have
  const existingDesigns = new Map<string, DesignRecord>();
  try {
    const existingData = await fs.readFile(OUTPUT_PATH, 'utf8');
    const existingCatalog = JSON.parse(existingData);
    if (existingCatalog?.designs && Array.isArray(existingCatalog.designs)) {
      for (const design of existingCatalog.designs) {
        if (design.slug && design.variants && design.variants.length > 0) {
          existingDesigns.set(design.slug, design);
        }
      }
      console.log(`📦 Loaded ${existingDesigns.size} existing designs from catalog`);
    }
  } catch (err) {
    console.log('📦 No existing catalog found, starting fresh');
  }
  
  // Process each main category
  for (const catKey of Object.keys(categories)) {
    try {
      console.log(`\n===== PROCESSING CATEGORY: ${catKey.toUpperCase()} =====`);
      const designs = await crawlCategory(catKey);
      
      let newCount = 0;
      let updatedCount = 0;
      
      for (const design of designs) {
        if (seenSlugs.has(design.slug)) {
          // Design already exists - update category if this is more specific than "all"
          if (catKey !== 'all') {
            const existingDesign = allDesigns.find(d => d.slug === design.slug);
            if (existingDesign && existingDesign.category === 'all') {
              existingDesign.category = catKey;
              updatedCount++;
            }
          }
        } else {
          // New design - add it
          allDesigns.push(design);
          seenSlugs.add(design.slug);
          newCount++;
        }
      }
      
      console.log(`\n✅ Added ${newCount} new designs from ${catKey}, updated ${updatedCount} categories (${allDesigns.length} total so far)`);
      
      // Be nice to the server between categories
      await delay(2000);
      
    } catch (error) {
      console.error(`\n❌ Error processing category ${catKey}:`, error);
      // Continue with next category even if one fails
      await delay(5000); // Longer delay after error
    }
  }

  console.log(`Found ${allDesigns.length} designs, enriching…`);
  let skippedCount = 0;
  let enrichedCount = 0;
  
  // Process in smaller parallel batches with retry queue for failed items
  const failedDesigns: { index: number; design: DesignRecord }[] = [];
  
  for (let i = 0; i < allDesigns.length; i += BATCH_SIZE) {
    const batch = allDesigns.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (design, batchIndex) => {
      const actualIndex = i + batchIndex;
      
      // Skip enrichment if we already have complete data for this item
      if (existingDesigns.has(design.slug)) {
        const existingDesign = existingDesigns.get(design.slug)!;
        skippedCount++;
        if (skippedCount % 50 === 0) {
          console.log(`  ⏭️  Skipped ${skippedCount} already-enriched items...`);
        }
        return { index: actualIndex, design: existingDesign, skipped: true, failed: false };
      }
      
      // Add small delay between requests within batch to spread load
      await delay(batchIndex * REQUEST_DELAY_MS);
      
      try {
        const enriched = await enrichDesign(design);
        enrichedCount++;
        if (enrichedCount % 10 === 0) {
          console.log(`  ✓ Enriched ${enrichedCount}/${allDesigns.length - skippedCount} items...`);
        }
        return { index: actualIndex, design: enriched, skipped: false, failed: false };
      } catch (err) {
        console.warn(`  ⚠️ Failed to enrich ${design.slug}:`, err);
        return { index: actualIndex, design, skipped: false, failed: true };
      }
    });
    
    const results = await Promise.all(batchPromises);
    results.forEach(({ index, design, failed }) => {
      if (failed) {
        failedDesigns.push({ index, design });
      } else {
        allDesigns[index] = design;
      }
    });
    
    // Delay between batches to avoid overwhelming the server
    await delay(BATCH_DELAY_MS);
  }
  
  // Retry failed designs one at a time with longer delays
  if (failedDesigns.length > 0) {
    console.log(`\n🔄 Retrying ${failedDesigns.length} failed enrichments one at a time...`);
    let retrySuccessCount = 0;
    
    for (const { index, design } of failedDesigns) {
      // Wait longer before each retry
      await delay(3000);
      
      try {
        console.log(`  ↻ Retrying ${design.slug}...`);
        const enriched = await enrichDesign(design);
        allDesigns[index] = enriched;
        retrySuccessCount++;
        enrichedCount++;
        console.log(`  ✓ Retry succeeded for ${design.slug}`);
      } catch (err) {
        console.warn(`  ⚠️ Retry failed for ${design.slug}:`, err);
        // Preserve existing data if available, otherwise keep basic design info
        if (existingDesigns.has(design.slug)) {
          allDesigns[index] = existingDesigns.get(design.slug)!;
        } else {
          allDesigns[index] = design;
        }
      }
    }
    
    console.log(`  ✅ Retry phase complete: ${retrySuccessCount}/${failedDesigns.length} succeeded`);
  }
  
  console.log(`\n✅ Enriched ${enrichedCount} new items, skipped ${skippedCount} existing items`);

  // Merge in existing designs that weren't found during this crawl
  // This prevents data loss when Spring returns 500 errors for entire categories
  let preservedCount = 0;
  for (const [slug, existingDesign] of existingDesigns.entries()) {
    if (!seenSlugs.has(slug)) {
      allDesigns.push(existingDesign);
      seenSlugs.add(slug);
      preservedCount++;
    }
  }
  if (preservedCount > 0) {
    console.log(`📦 Preserved ${preservedCount} existing designs that weren't found during this crawl`);
  }

  // Filter out any undefined or incomplete designs
  const validDesigns = allDesigns.filter(d => d && d.slug && d.title);
  const failedCount = allDesigns.length - validDesigns.length;
  if (failedCount > 0) {
    console.log(`⚠️  Filtered out ${failedCount} incomplete designs`);
  }

  // Expand designs into individual products (one per product type)
  // This allows each product type (t-shirt, hoodie, tank, etc.) to display as a separate card
  console.log(`\n🔄 Expanding designs into individual product cards...`);
  const expandedProducts: DesignRecord[] = [];
  
  for (const design of validDesigns) {
    // Group variants by product type
    const productTypeMap = new Map<string, VariantRecord[]>();
    
    for (const variant of design.variants) {
      const productType = variant.productType || 'Unknown Product';
      if (!productTypeMap.has(productType)) {
        productTypeMap.set(productType, []);
      }
      productTypeMap.get(productType)!.push(variant);
    }
    
    // Create a separate product entry for each product type
    for (const [productType, variants] of productTypeMap.entries()) {
      // Use first variant's image as hero image for this product type
      const heroImage = variants[0]?.image || design.heroImage;
      
      // Categorize based on product type (mug->drinkware, hat->accessories, shirt->apparel)
      const category = categorizeByProductType(productType);
      
      expandedProducts.push({
        slug: `${design.slug}-${productType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: `${design.title} - ${productType}`,
        category,
        heroImage,
        variants,
        lastIndexed: design.lastIndexed,
      });
    }
  }

  console.log(`✨ Expanded ${validDesigns.length} designs into ${expandedProducts.length} individual product cards`);

  const payload = {
    generatedAt: new Date().toISOString(),
    store: STORE_SLUG,
    designs: expandedProducts,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\n📦 Saved ${expandedProducts.length} product cards to ${OUTPUT_PATH}`);
  console.log(`\n📊 Final Summary:`);
  console.log(`   - Designs crawled this run: ${allDesigns.length - preservedCount}`);
  console.log(`   - Newly enriched: ${enrichedCount}`);
  console.log(`   - Skipped (already in catalog): ${skippedCount}`);
  console.log(`   - Preserved from previous catalog: ${preservedCount}`);
  console.log(`   - Total designs before expansion: ${validDesigns.length}`);
  console.log(`   - Total product cards after expansion: ${expandedProducts.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
