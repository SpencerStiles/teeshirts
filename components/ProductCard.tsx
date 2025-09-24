import { Box, Image, Heading, Text, Button, LinkBox, LinkOverlay, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import type { Product } from '@/data/products';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  return (
    <LinkBox as="article" borderWidth="1px" borderRadius="lg" overflow="hidden" bg="background.light" _dark={{ bg: 'gray.900' }} shadow="lg" transition="box-shadow 0.2s" _hover={{ shadow: '2xl' }}>
      <Box h="260px" w="100%" overflow="hidden">
        <Image src={product.image} alt={product.title} w="100%" h="100%" objectFit="cover" transition="transform 0.5s" _groupHover={{ transform: 'scale(1.05)' }} />
      </Box>
      <VStack align="stretch" spacing={2} p={4}>
        <Heading size="md" noOfLines={1}>
          <LinkOverlay as={Link} href={`/p/${product.slug}`}>{product.title}</LinkOverlay>
        </Heading>
        {product.price && (
          <Text color="gray.500">{product.price}</Text>
        )}
        <Button as={Link} href={`/p/${product.slug}`} mt={2} rounded="full" bg="primary" color="white" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
          View Details
        </Button>
      </VStack>
    </LinkBox>
  );
}
