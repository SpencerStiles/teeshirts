import { GetServerSideProps } from 'next';
import { products } from '@/data/products';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = ctx.params?.slug as string | undefined;
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return {
      redirect: {
        destination: '/shop',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: product.springUrl,
      permanent: false,
    },
  };
};

// This page renders nothing; it only redirects on the server.
export default function GoRedirect() {
  return null;
}
