import { Box, Image, Heading, Text, LinkBox, LinkOverlay, VStack, useColorModeValue } from '@chakra-ui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { humanizeSlugTitle } from '@/lib/title';

interface Props {
  product: {
    slug: string;
    title: string;
    image: string;
    price?: string;
  };
}

export default function ProductCard({ product }: Props) {
  const [images, setImages] = useState<string[]>([product.image]);
  const [isHovered, setIsHovered] = useState(false);

  const cardBg = useColorModeValue('background.light', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const displayTitle = humanizeSlugTitle(product.title, product.slug);

  useEffect(() => {
    // Disable additional image fetching for now
    // The API can't reliably match products with the new slug format
    // Keep the initial product.image which is correct from the category page
    let cancelled = false;
    return () => { cancelled = true; };
  }, [product.slug]);

  // Show front image by default, back image on hover (if available)
  const displayImage = isHovered && images.length > 1 ? images[1] : images[0] || product.image;

  return (
    <LinkBox 
      as="article" 
      borderWidth="1px" 
      borderColor={borderColor}
      borderRadius="lg" 
      overflow="hidden" 
      bg={cardBg}
      shadow="md" 
      transition="all 0.2s" 
      _hover={{ shadow: 'xl', transform: 'translateY(-2px)' }} 
      role="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box position="relative" h="300px" w="100%" overflow="hidden" bg="gray.100" _dark={{ bg: 'gray.800' }}>
        <Image 
          src={displayImage || product.image} 
          alt={displayTitle || product.title} 
          w="100%" 
          h="100%" 
          objectFit="cover" 
          transition="opacity 0.3s ease-in-out"
        />
      </Box>
      
      <VStack align="stretch" spacing={3} p={4}>
        <Heading size="sm" noOfLines={2} minH="40px">
          <LinkOverlay as={Link} href={`/p/${product.slug}`}>
            {displayTitle}
          </LinkOverlay>
        </Heading>
        
        {product.price && (
          <Text fontWeight="semibold" fontSize="lg" color="primary">
            {product.price}
          </Text>
        )}
      </VStack>
    </LinkBox>
  );
}
