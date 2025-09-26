import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchSpringProductDetailBySlug } from '@/lib/spring';

// Simple in-memory cache (per server instance)
type CacheEntry = { images: string[]; expiresAt: number };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = (req.query.slug as string | undefined)?.toString().trim();
  const force = (req.query.force as string | undefined) === '1';
  if (!slug) {
    return res.status(400).json({ error: 'Missing slug' });
  }
  try {
    const now = Date.now();
    const hit = CACHE.get(slug);
    if (!force && hit && hit.expiresAt > now) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ images: hit.images });
    }

    const product = await fetchSpringProductDetailBySlug(slug);
    if (!product) return res.status(404).json({ error: 'Not found' });
    const images = product.images && product.images.length > 0 ? product.images : [product.image];

    CACHE.set(slug, { images, expiresAt: now + TTL_MS });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ images });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to load images' });
  }
}
