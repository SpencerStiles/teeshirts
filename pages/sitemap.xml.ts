import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ res, req }) => {
  const host = req.headers.host || 'localhost:3000';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;
  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <url>\n` +
  `    <loc>${baseUrl}/</loc>\n` +
  `    <lastmod>${now}</lastmod>\n` +
  `    <changefreq>daily</changefreq>\n` +
  `    <priority>0.8</priority>\n` +
  `  </url>\n` +
  `  <url>\n` +
  `    <loc>${baseUrl}/shop</loc>\n` +
  `    <lastmod>${now}</lastmod>\n` +
  `    <changefreq>daily</changefreq>\n` +
  `    <priority>1.0</priority>\n` +
  `  </url>\n` +
  `</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.write(xml);
  res.end();

  return { props: {} } as const;
};

export default function SiteMap() {
  return null;
}
