import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';

export type CatalogVariant = {
  productId: string;
  label: string;
  image: string;
  price?: string;
  springUrl: string;
  productType?: string;
  colorName?: string;
  colorHex?: string;
};

export type CatalogDesign = {
  slug: string;
  title: string;
  category: 'apparel' | 'accessories' | 'drinkware' | string;
  heroImage: string;
  variants: CatalogVariant[];
  lastIndexed: string;
};

export type SpringCatalog = {
  generatedAt: string;
  store: string;
  designs: CatalogDesign[];
};

const gunzipAsync = promisify(gunzip);

const CATALOG_PATH = path.join(process.cwd(), 'data', 'springCatalog.json');
const CATALOG_GZ_PATH = `${CATALOG_PATH}.gz`;

async function readCatalogPayload(): Promise<string | null> {
  // Prefer the compressed catalog to keep the repo smaller, but fall back to JSON if needed
  try {
    const compressed = await fs.readFile(CATALOG_GZ_PATH);
    const buffer = await gunzipAsync(compressed);
    return buffer.toString('utf8');
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.warn('Failed to read compressed Spring catalog', err);
      return null;
    }
  }

  try {
    return await fs.readFile(CATALOG_PATH, 'utf8');
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.warn('Failed to read Spring catalog JSON', err);
    }
    return null;
  }
}

export async function loadSpringCatalog(): Promise<SpringCatalog | null> {
  const raw = await readCatalogPayload();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpringCatalog;
  } catch (err) {
    console.warn('Failed to parse Spring catalog', err);
    return null;
  }
}

export async function listCatalogDesigns(): Promise<CatalogDesign[]> {
  const catalog = await loadSpringCatalog();
  return catalog?.designs ?? [];
}

export async function getCatalogDesign(slug: string): Promise<CatalogDesign | null> {
  const catalog = await loadSpringCatalog();
  if (!catalog) return null;
  return catalog.designs.find((d) => d.slug === slug) ?? null;
}
