import fs from 'node:fs/promises';
import path from 'node:path';

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

const CATALOG_PATH = path.join(process.cwd(), 'data', 'springCatalog.json');

export async function loadSpringCatalog(): Promise<SpringCatalog | null> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, 'utf8');
    return JSON.parse(raw) as SpringCatalog;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    console.warn('Failed to load Spring catalog', err);
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
