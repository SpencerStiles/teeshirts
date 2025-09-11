# SGT Major Says Shop

Next.js + Chakra UI site that embeds the Spring (Teespring) storefront and features a curated row.

## Local development

1. Install deps

```bash
npm install
```

2. Run dev server

```bash
npm run dev
```

3. Open http://localhost:3000 ("/" redirects to "/shop").

## Featured row
- Edit `components/FeaturedRow.tsx` to set real titles and links.
- Replace `/public/featured*.svg` with your product images if desired.

## Embed controls
- Use the controls on `/shop` to change items per page, layout, and color theme (reflects in the widget).

## Deploy to Vercel
- Create a new Vercel project and point to this folder.
- Framework preset: Next.js
- Build command: `next build`
- Output dir: `.next`

