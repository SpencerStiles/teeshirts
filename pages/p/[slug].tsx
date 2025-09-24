import { GetStaticPaths, GetStaticProps } from 'next';
import { Box, Button, Container, Heading, Image, Stack, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import { products, type Product } from '@/data/products';

interface Props {
  product: Product | null;
}

export default function ProductPage({ product }: Props) {
  if (!product) {
    return (
      <Container maxW="2xl" py={16}>
        <Heading size="lg" mb={4}>Product not found</Heading>
        <Button as={Link} href="/shop" colorScheme="gray">Back to shop</Button>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py={10}>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={8} align="flex-start">
        <Box flex="1" overflow="hidden" borderRadius="xl" borderWidth="1px">
          <Image src={product.image} alt={product.title} w="100%" h="100%" objectFit="cover" />
        </Box>
        <VStack align="stretch" spacing={4} flex="1">
          <Heading size="xl" textTransform="none">{product.title}</Heading>
          {product.price && <Text fontSize="lg" color="gray.400">{product.price}</Text>}
          <Text color="gray.500">High-quality merch. Ships globally via Spring.</Text>
          <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} pt={2}>
            <Button as={Link} href={`/go/${product.slug}`} rounded="full" bg="primary" color="white" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
              Buy Now
            </Button>
            <Button as={Link} href="/shop" variant="outline" rounded="full">Back to Catalog</Button>
          </Stack>
        </VStack>
      </Stack>
    </Container>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: products.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string | undefined;
  const product = products.find((p) => p.slug === slug) || null;
  return { props: { product } };
};
