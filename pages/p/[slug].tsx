import { GetServerSideProps } from 'next';
import { Box, Button, Container, Heading, Image, Stack, Text, VStack, HStack, IconButton } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { fetchSpringProductDetailBySlug, type SpringProduct } from '@/lib/spring';
import { products as fallbackProducts } from '@/data/products';
import { useState } from 'react';

interface Props {
  product: { slug: string; title: string; image: string; images?: string[]; price?: string } | null;
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

  // Gallery state
  const [current, setCurrent] = useState<string>(product.images?.[0] ?? product.image);
  const imgs = (product.images && product.images.length > 0) ? product.images : [product.image];
  const curIndex = Math.max(0, imgs.findIndex((u) => u === current));
  const hasMultiple = imgs.length > 1;
  const prev = () => {
    if (!hasMultiple) return;
    const i = (curIndex - 1 + imgs.length) % imgs.length;
    setCurrent(imgs[i]);
  };
  const next = () => {
    if (!hasMultiple) return;
    const i = (curIndex + 1) % imgs.length;
    setCurrent(imgs[i]);
  };

  return (
    <Container maxW="6xl" py={10}>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={8} align="flex-start">
        <Box flex="1" overflow="hidden" borderRadius="xl" borderWidth="1px" position="relative">
          <Image src={current} alt={product.title} w="100%" h="100%" objectFit="cover" />
          {hasMultiple && (
            <>
              <IconButton
                aria-label="Previous image"
                onClick={prev}
                icon={<ChevronLeftIcon boxSize={6} />}
                position="absolute"
                top="50%"
                left="3"
                transform="translateY(-50%)"
                variant="solid"
                colorScheme="blackAlpha"
                color="white"
                rounded="full"
                boxShadow="sm"
                _hover={{ bg: 'blackAlpha.800' }}
                _active={{ bg: 'blackAlpha.900' }}
              />
              <IconButton
                aria-label="Next image"
                onClick={next}
                icon={<ChevronRightIcon boxSize={6} />}
                position="absolute"
                top="50%"
                right="3"
                transform="translateY(-50%)"
                variant="solid"
                colorScheme="blackAlpha"
                color="white"
                rounded="full"
                boxShadow="sm"
                _hover={{ bg: 'blackAlpha.800' }}
                _active={{ bg: 'blackAlpha.900' }}
              />
            </>
          )}
          {hasMultiple && (
            <HStack spacing={2} mt={3} p={3}>
              {imgs.map((src) => (
                <Box key={src} as="button" onClick={() => setCurrent(src)} borderWidth={current === src ? '2px' : '1px'} borderColor={current === src ? 'primary' : 'gray.200'} rounded="md" overflow="hidden">
                  <Image src={src} alt="thumbnail" w="72px" h="72px" objectFit="cover" />
                </Box>
              ))}
            </HStack>
          )}
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

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string | undefined;
  if (!slug) return { props: { product: null } };

  try {
    const dynamic = await fetchSpringProductDetailBySlug(slug);
    if (dynamic) return { props: { product: { slug: dynamic.slug, title: dynamic.title, image: dynamic.image, images: dynamic.images } } };
  } catch {}

  const fallback = fallbackProducts.find((p) => p.slug === slug);
  if (fallback) return { props: { product: { slug: fallback.slug, title: fallback.title, image: fallback.image, images: [fallback.image], price: fallback.price } } };
  return { props: { product: null } };
};
