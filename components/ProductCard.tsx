import { Box, Image, Heading, Text, LinkBox, LinkOverlay, VStack, HStack, useColorModeValue } from '@chakra-ui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ColorVariant {
  name: string;
  hex: string;
}

interface Props {
  product: {
    slug: string;
    title: string;
    image: string;
    price?: string;
    colors?: ColorVariant[];
  };
}

export default function ProductCard({ product }: Props) {
  const [images, setImages] = useState<string[]>([product.image]);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const cardBg = useColorModeValue('background.light', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    let cancelled = false;
    async function loadImages() {
      try {
        const res = await fetch(`/api/product-images?slug=${encodeURIComponent(product.slug)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.images) && data.images.length > 0) {
          setImages(data.images);
        }
      } catch {}
    }
    loadImages();
    return () => { cancelled = true; };
  }, [product.slug]);

  // Default colors if none provided (placeholder for future enhancement)
  const colors: ColorVariant[] = product.colors || [
    { name: 'Black', hex: '#000000' },
    { name: 'Navy', hex: '#1a365d' },
    { name: 'Gray', hex: '#718096' },
  ];

  // Show front image by default, back image on hover
  const displayImage = isHovered && images.length > 1 ? images[1] : images[0];

  const handleColorClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColorIndex(index);
  };

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
          alt={product.title} 
          w="100%" 
          h="100%" 
          objectFit="cover" 
          transition="opacity 0.3s ease-in-out"
        />
      </Box>
      
      <VStack align="stretch" spacing={3} p={4}>
        <Heading size="sm" noOfLines={2} minH="40px">
          <LinkOverlay as={Link} href={`/p/${product.slug}`}>
            {product.title}
          </LinkOverlay>
        </Heading>
        
        {product.price && (
          <Text fontWeight="semibold" fontSize="lg" color="primary">
            {product.price}
          </Text>
        )}

        {/* Color Variants */}
        {colors.length > 0 && (
          <Box>
            <Text fontSize="xs" color="gray.500" mb={2} textTransform="uppercase" letterSpacing="wide">
              Available Colors
            </Text>
            <HStack spacing={2}>
              {colors.slice(0, 5).map((color, idx) => (
                <Box
                  key={idx}
                  as="button"
                  w="24px"
                  h="24px"
                  rounded="full"
                  bg={color.hex}
                  borderWidth="2px"
                  borderColor={idx === selectedColorIndex ? 'primary' : 'gray.300'}
                  _dark={{ borderColor: idx === selectedColorIndex ? 'primary' : 'gray.600' }}
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ 
                    transform: 'scale(1.1)',
                    borderColor: 'primary'
                  }}
                  onClick={(e) => handleColorClick(e, idx)}
                  onMouseDown={(e) => e.stopPropagation()}
                  title={color.name}
                  aria-label={`Select ${color.name} color`}
                />
              ))}
              {colors.length > 5 && (
                <Text fontSize="xs" color="gray.500">
                  +{colors.length - 5}
                </Text>
              )}
            </HStack>
          </Box>
        )}
      </VStack>
    </LinkBox>
  );
}
