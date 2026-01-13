// scripts/ingest-spring.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { load } from 'cheerio';

const STORE_SLUG = 'sgt-major-says';
const BASE_URL = `https://${STORE_SLUG}.creator-spring.com`;
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'springCatalog.json');
const OUTPUT_GZ_PATH = `${OUTPUT_PATH}.gz`;
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Rate limiting configuration (tunable via env) - defaults are conservative to avoid 429s
const MAX_RETRIES = parseInt(process.env.INGEST_MAX_RETRIES ?? '8', 10);
const INITIAL_RETRY_DELAY_MS = parseInt(process.env.INGEST_INITIAL_RETRY_DELAY_MS ?? '10000', 10);
const MAX_RETRY_DELAY_MS = parseInt(process.env.INGEST_MAX_RETRY_DELAY_MS ?? '120000', 10);
const BATCH_SIZE = parseInt(process.env.INGEST_BATCH_SIZE ?? '1', 10);
const BATCH_DELAY_MS = parseInt(process.env.INGEST_BATCH_DELAY_MS ?? '5000', 10);
const REQUEST_DELAY_MS = parseInt(process.env.INGEST_REQUEST_DELAY_MS ?? '3000', 10);
const CATEGORY_PAGE_DELAY_MS = parseInt(process.env.INGEST_CATEGORY_PAGE_DELAY_MS ?? '4000', 10);
const CATEGORY_RESOLVE_DELAY_MS = parseInt(process.env.INGEST_CATEGORY_RESOLVE_DELAY_MS ?? '8000', 10);
const CATEGORY_GAP_DELAY_MS = parseInt(process.env.INGEST_CATEGORY_GAP_DELAY_MS ?? '5000', 10);
const WARMUP_DELAY_MS = parseInt(process.env.INGEST_WARMUP_DELAY_MS ?? '5000', 10);
const JITTER_FACTOR = parseFloat(process.env.INGEST_JITTER_FACTOR ?? '0.3'); // 30% random jitter
const EARLY_STOP_THRESHOLD = parseInt(process.env.INGEST_EARLY_STOP_THRESHOLD ?? '20', 10); // Stop crawling after N consecutive existing items
const STARTUP_DELAY_MS = parseInt(process.env.INGEST_STARTUP_DELAY_MS ?? '120000', 10); // 2 minute base startup delay
const STARTUP_JITTER_MS = parseInt(process.env.INGEST_STARTUP_JITTER_MS ?? '60000', 10); // Additional 0-60s random jitter

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Add random jitter to delays to appear more human-like
function jitteredDelay(baseMs: number): number {
  const jitter = baseMs * JITTER_FACTOR * (Math.random() * 2 - 1); // +/- JITTER_FACTOR
  return Math.max(500, Math.round(baseMs + jitter));
}

// Realistic User-Agent strings to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Build realistic browser headers
function getBrowserHeaders(url: string, isNavigate = true): Record<string, string> {
  const parsedUrl = new URL(url);
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': isNavigate 
      ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      : 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': isNavigate ? 'document' : 'empty',
    'Sec-Fetch-Mode': isNavigate ? 'navigate' : 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': isNavigate ? '?1' : undefined,
    'Upgrade-Insecure-Requests': isNavigate ? '1' : undefined,
    'Referer': `${parsedUrl.origin}/`,
  } as Record<string, string>;
}

// Warm-up: visit homepage to establish session before crawling
let sessionWarmedUp = false;
let startupDelayCompleted = false;

async function performStartupDelay(): Promise<void> {
  if (startupDelayCompleted) return;
  
  // Add a long random delay before any network activity to avoid rate limit triggers
  const randomJitter = Math.random() * STARTUP_JITTER_MS;
  const totalStartupDelay = STARTUP_DELAY_MS + randomJitter;
  
  console.log('⏳ Performing startup delay to avoid rate limiting...');
  console.log(`   Waiting ${(totalStartupDelay / 1000).toFixed(0)}s (${(STARTUP_DELAY_MS / 1000).toFixed(0)}s base + ${(randomJitter / 1000).toFixed(0)}s jitter) before any requests...`);
  
  // Show progress every 30 seconds so user knows it's still running
  const startTime = Date.now();
  const endTime = startTime + totalStartupDelay;
  
  while (Date.now() < endTime) {
    const remaining = Math.ceil((endTime - Date.now()) / 1000);
    if (remaining > 0 && remaining % 30 === 0) {
      console.log(`   ${remaining}s remaining...`);
    }
    await delay(Math.min(1000, endTime - Date.now()));
  }
  
  console.log('✅ Startup delay complete, beginning crawl...');
  startupDelayCompleted = true;
}

async function warmUpSession(): Promise<void> {
  if (sessionWarmedUp) return;
  
  // First, perform the long startup delay
  await performStartupDelay();
  
  console.log('🔥 Warming up session by visiting homepage...');
  const initialDelay = jitteredDelay(WARMUP_DELAY_MS);
  console.log(`   Waiting ${(initialDelay / 1000).toFixed(1)}s before first request...`);
  await delay(initialDelay);
  
  try {
    const res = await fetch(BASE_URL, {
      headers: getBrowserHeaders(BASE_URL, true),
    });
    if (res.ok) {
      console.log('✅ Session warm-up successful');
      // Wait a bit after successful warm-up to seem more human
      await delay(jitteredDelay(3000));
      sessionWarmedUp = true;
    } else if (res.status === 429 || res.status === 403) {
      // Rate limited on warmup - fail fast, don't waste time retrying
      console.error(`❌ FATAL: Rate limited (${res.status}) on warmup request.`);
      console.error('   The site is actively blocking requests. Aborting job to avoid wasting time.');
      console.error('   Try again later or adjust the schedule to reduce request frequency.');
      process.exit(1);
    } else {
      console.log(`⚠️ Session warm-up returned ${res.status}, proceeding with caution...`);
      await delay(jitteredDelay(8000));
      sessionWarmedUp = true;
    }
  } catch (err) {
    console.log('⚠️ Session warm-up failed (network error), proceeding with caution...', err);
    await delay(jitteredDelay(10000));
    sessionWarmedUp = true;
  }
}

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
  // Ensure session is warmed up before making requests
  await warmUpSession();
  
  try {
    // Add cache-busting query param to ensure fresh content
    const cacheBustUrl = new URL(url);
    cacheBustUrl.searchParams.set('_cb', Date.now().toString());
    
    const res = await fetch(cacheBustUrl.toString(), {
      headers: getBrowserHeaders(url, false),
    });
    
    if (res.status === 429 || res.status === 403 || (res.status >= 500 && res.status < 600)) {
      if (retryCount >= MAX_RETRIES) return null;
      const backoffDelay = jitteredDelay(Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      ));
      console.log(`    ⏳ HTTP ${res.status}, waiting ${(backoffDelay / 1000).toFixed(1)}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await delay(backoffDelay);
      return fetchJson(url, retryCount + 1);
    }
    
    if (!res.ok) return null;
    return await res.json();
  } catch {
    if (retryCount >= MAX_RETRIES) return null;
    const backoffDelay = jitteredDelay(Math.min(
      INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
      MAX_RETRY_DELAY_MS
    ));
    await delay(backoffDelay);
    return fetchJson(url, retryCount + 1);
  }
}

async function fetchHtml(url: string, retryCount = 0): Promise<string> {
  // Ensure session is warmed up before making requests
  await warmUpSession();
  
  try {
    // Add cache-busting query param to ensure fresh content
    const cacheBustUrl = new URL(url);
    cacheBustUrl.searchParams.set('_cb', Date.now().toString());
    
    const res = await fetch(cacheBustUrl.toString(), {
      headers: getBrowserHeaders(url, true),
    });
    
    if (res.status === 429 || res.status === 403) {
      // Rate limited or forbidden - apply exponential backoff with jitter
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`HTTP ${res.status} after ${MAX_RETRIES} retries: ${url}`);
      }
      const backoffDelay = jitteredDelay(Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      ));
      console.log(`    ⏳ HTTP ${res.status}, waiting ${(backoffDelay / 1000).toFixed(1)}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await delay(backoffDelay);
      return fetchHtml(url, retryCount + 1);
    }
    
    if (res.status >= 500 && res.status < 600) {
      // Server error - retry with backoff and jitter
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`Server error ${res.status} after ${MAX_RETRIES} retries: ${url}`);
      }
      const backoffDelay = jitteredDelay(Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      ));
      console.log(`    ⏳ Server error (${res.status}), waiting ${(backoffDelay / 1000).toFixed(1)}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await delay(backoffDelay);
      return fetchHtml(url, retryCount + 1);
    }
    
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.text();
  } catch (err: any) {
    // Network errors - retry with backoff and jitter
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND' || err.name === 'AbortError') {
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`Network error after ${MAX_RETRIES} retries: ${url} - ${err.message}`);
      }
      const backoffDelay = jitteredDelay(Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
      ));
      console.log(`    ⏳ Network error, waiting ${(backoffDelay / 1000).toFixed(1)}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
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
const DEFAULT_CATEGORY_ORDER = Object.keys(categories);
const enabledCategories = new Set(
  (process.env.INGEST_CATEGORIES ?? DEFAULT_CATEGORY_ORDER.join(','))
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
);

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
  catKey: string,
  existingSlugs: Set<string> = new Set()
): Promise<{ listings: DesignRecord[]; stoppedEarly: boolean }> {
  const listings: DesignRecord[] = [];
  let page = entry.firstPage;
  let consecutiveEmpty = 0;
  let consecutiveExisting = 0;
  let firstPageConsumed = false;
  let currentPageUrl = entry.firstUrl;
  let stoppedEarly = false;

  while (page <= MAX_CATEGORY_PAGES && consecutiveEmpty < 2 && consecutiveExisting < EARLY_STOP_THRESHOLD) {
    let html: string;
    
    try {
      if (!firstPageConsumed && entry.firstHtml) {
        html = entry.firstHtml;
        firstPageConsumed = true;
      } else {
        currentPageUrl = buildCategoryPageUrl(entry.normalizedPath, page);
        console.log(`  [${entry.title}] Page ${page} → ${currentPageUrl}`);
        html = await fetchHtml(currentPageUrl);
        await delay(jitteredDelay(CATEGORY_PAGE_DELAY_MS)); // Be gentle to avoid 500 errors
      }

      const $ = load(html);
      let foundOnPage = 0;

      // Look for product links
      let newOnPage = 0;
      let existingOnPage = 0;
      
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

        // Check if this item already exists in our catalog
        if (existingSlugs.has(slug)) {
          existingOnPage++;
          seenSlugs.add(slug); // Mark as seen so we don't process again
          return;
        }

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
        newOnPage++;
      });

      foundOnPage = newOnPage + existingOnPage;
      
      if (foundOnPage === 0) {
        consecutiveEmpty += 1;
        console.log(`  No products found on page ${page}`);
      } else {
        consecutiveEmpty = 0;
        // Track consecutive existing items for early stopping
        if (newOnPage === 0 && existingOnPage > 0) {
          consecutiveExisting += existingOnPage;
          console.log(`  Found ${existingOnPage} existing products on page ${page} (${consecutiveExisting}/${EARLY_STOP_THRESHOLD} toward early stop)`);
        } else {
          consecutiveExisting = 0; // Reset if we found new items
          console.log(`  Found ${newOnPage} new, ${existingOnPage} existing products on page ${page}`);
        }
      }
    } catch (error) {
      console.error(`  Error processing page ${page}:`, error);
      consecutiveEmpty += 1;
    }

    page += 1;
  }

  if (consecutiveExisting >= EARLY_STOP_THRESHOLD) {
    stoppedEarly = true;
    console.log(`  ⏹️ Early stop: Found ${consecutiveExisting} consecutive existing items, assuming we've reached old content`);
  }

  return { listings, stoppedEarly };
}

async function crawlCategory(catKey: string, existingSlugs: Set<string> = new Set()): Promise<DesignRecord[]> {
  const listings: DesignRecord[] = [];
  const seenSlugs = new Set<string>();
  const categoryPath = categories[catKey];
  let totalStoppedEarly = false;
  
  console.log(`\n=== Starting crawl of category: ${catKey} (${categoryPath}) ===`);
  
  // First, get the main category entries
  const mainEntries = await resolveCategoryEntry(categoryPath, false, catKey);
  
  // Process each entry (main category + subcategories)
  for (const entry of mainEntries) {
    if (totalStoppedEarly) break; // Don't process more entries if we already stopped early
    
    console.log(`\nProcessing ${entry.isSubcategory ? 'subcategory' : 'category'}: ${entry.title}`);
    
    // If this is a subcategory, we might need to resolve it further
    if (entry.isSubcategory && !entry.firstHtml) {
      const subEntries = await resolveCategoryEntry(entry.normalizedPath, true, entry.title);
      
      for (const subEntry of subEntries) {
        if (totalStoppedEarly) break;
        const { listings: subListings, stoppedEarly } = await crawlCategoryPage(subEntry, seenSlugs, catKey, existingSlugs);
        listings.push(...subListings);
        if (stoppedEarly) totalStoppedEarly = true;
      }
    } else {
      // Process the main category or already resolved subcategory
      const { listings: categoryListings, stoppedEarly } = await crawlCategoryPage(entry, seenSlugs, catKey, existingSlugs);
      listings.push(...categoryListings);
      if (stoppedEarly) totalStoppedEarly = true;
    }
  }
  
  console.log(`\n=== Finished crawl of ${catKey}: Found ${listings.length} unique products${totalStoppedEarly ? ' (stopped early)' : ''} ===`);
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

async function readExistingCatalogPayload(): Promise<string | null> {
  try {
    const compressed = await fs.readFile(OUTPUT_GZ_PATH);
    const buffer = await gunzipAsync(compressed);
    return buffer.toString('utf8');
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.warn('Failed to read compressed catalog snapshot', err);
      return null;
    }
  }

  try {
    return await fs.readFile(OUTPUT_PATH, 'utf8');
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.warn('Failed to read catalog JSON snapshot', err);
    }
    return null;
  }
}

async function main() {
  if (enabledCategories.size === 0) {
    console.warn('No categories enabled via INGEST_CATEGORIES; nothing to do.');
    return;
  }
  console.log(
    `🗂️  Categories to process: ${DEFAULT_CATEGORY_ORDER.filter((c) =>
      enabledCategories.has(c)
    ).join(', ')}`
  );
  const allDesigns: DesignRecord[] = [];
  const seenSlugs = new Set<string>();
  
  // Load existing catalog to avoid re-fetching items we already have
  const existingDesigns = new Map<string, DesignRecord>();
  try {
    const existingPayload = await readExistingCatalogPayload();
    if (!existingPayload) {
      throw Object.assign(new Error('No catalog snapshot found'), { code: 'ENOENT' });
    }
    const existingData = existingPayload;
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
  
  // Create a set of existing slugs for early stop detection during crawling
  const existingSlugs = new Set(existingDesigns.keys());
  
  // Process each main category
  for (const catKey of DEFAULT_CATEGORY_ORDER) {
    if (!enabledCategories.has(catKey)) {
      continue;
    }
    try {
      console.log(`\n===== PROCESSING CATEGORY: ${catKey.toUpperCase()} =====`);
      const designs = await crawlCategory(catKey, existingSlugs);
      
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
      await delay(jitteredDelay(CATEGORY_GAP_DELAY_MS));
      
    } catch (error) {
      console.error(`\n❌ Error processing category ${catKey}:`, error);
      // Continue with next category even if one fails
      await delay(jitteredDelay(CATEGORY_GAP_DELAY_MS * 2)); // Longer delay after error
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
      await delay(jitteredDelay(batchIndex * REQUEST_DELAY_MS));
      
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
    await delay(jitteredDelay(BATCH_DELAY_MS));
  }
  
  // Retry failed designs one at a time with longer delays
  if (failedDesigns.length > 0) {
    console.log(`\n🔄 Retrying ${failedDesigns.length} failed enrichments one at a time...`);
    let retrySuccessCount = 0;
    
    for (const { index, design } of failedDesigns) {
      // Wait longer before each retry
      await delay(jitteredDelay(BATCH_DELAY_MS * 2));
      
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
  const payloadJson = JSON.stringify(payload, null, 2);
  await fs.writeFile(OUTPUT_PATH, payloadJson, 'utf8');
  const compressed = await gzipAsync(Buffer.from(payloadJson, 'utf8'));
  await fs.writeFile(OUTPUT_GZ_PATH, compressed);
  console.log(`\n📦 Saved ${expandedProducts.length} product cards to ${OUTPUT_PATH}`);
  console.log(`💾 Compressed catalog → ${OUTPUT_GZ_PATH} (${(compressed.length / (1024 * 1024)).toFixed(1)} MB)`);
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
