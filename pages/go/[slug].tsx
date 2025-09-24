import { GetServerSideProps } from 'next';
import { fetchSpringProductBySlug } from '@/lib/spring';
import { products as fallbackProducts } from '@/data/products';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = ctx.params?.slug as string | undefined;
  if (!slug) {
    return { redirect: { destination: '/shop', permanent: false } };
  }

  // Try dynamic lookup first
  try {
    const p = await fetchSpringProductBySlug(slug);
    if (p) return { redirect: { destination: p.springUrl, permanent: false } };
  } catch {}

  // Fallback to local products map
  const fallback = fallbackProducts.find((p) => p.slug === slug);
  if (fallback) return { redirect: { destination: fallback.springUrl, permanent: false } };

  return { redirect: { destination: '/shop', permanent: false } };
};

// This page renders nothing; it only redirects on the server.
export default function GoRedirect() {
  return null;
}
