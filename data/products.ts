export type Product = {
  slug: string;
  title: string;
  image: string; // path or absolute URL
  price?: string; // optional display price
  springUrl: string; // final checkout / product URL on Spring
};

// Seed a few products; replace with your real catalog when ready.
export const products: Product[] = [
  {
    slug: 'sgmsays-classic-tee',
    title: 'SGMSAYS Classic Tee',
    image: '/featured1.svg',
    springUrl: 'https://sgt-major-says.creator-spring.com/listing/get-sgmsays?product=14',
    price: '$24.99',
  },
  {
    slug: 'sgmsays-hoodie',
    title: 'SGMSAYS Hoodie',
    image: '/featured2.svg',
    springUrl: 'https://sgt-major-says.creator-spring.com/listing/get-sgmsays?product=1912',
    price: '$44.99',
  },
  {
    slug: 'sgmsays-mug',
    title: 'SGMSAYS Mug',
    image: '/featured3.svg',
    springUrl: 'https://sgt-major-says.creator-spring.com/listing/new-sgmsays?product=1896',
    price: '$14.99',
  },
];
