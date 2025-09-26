import { Box, Image, Heading, Text, Button, LinkBox, LinkOverlay, VStack, IconButton } from '@chakra-ui/react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';
import type React from 'react';

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
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadImages() {
      try {
        const res = await fetch(`/api/product-images?slug=${encodeURIComponent(product.slug)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.images) && data.images.length > 0) {
          setImages(data.images);
          setCurrentIndex(0);
        }
      } catch {}
    }
    loadImages();
    return () => { cancelled = true; };
  }, [product.slug]);

  const hasMultiple = images.length > 1;
  const prev = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  };
  const next = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentIndex((i) => (i + 1) % images.length);
  };

  return (
    <LinkBox as="article" borderWidth="1px" borderRadius="lg" overflow="hidden" bg="background.light" _dark={{ bg: 'gray.900' }} shadow="lg" transition="box-shadow 0.2s" _hover={{ shadow: '2xl' }} role="group">
      <Box position="relative" h="260px" w="100%" overflow="hidden" onMouseDown={(e) => { e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); }}>
        <Image src={images[currentIndex] || product.image} alt={product.title} w="100%" h="100%" objectFit="cover" transition="transform 0.5s" _groupHover={{ transform: 'scale(1.03)' }} />
        {hasMultiple && (
          <>
            <IconButton
              aria-label="Previous image"
              icon={<ChevronLeftIcon />}
              size="sm"
              variant="solid"
              colorScheme="blackAlpha"
              position="absolute"
              top="50%"
              left="2"
              transform="translateY(-50%)"
              zIndex={1}
              pointerEvents="auto"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={prev}
            />
            <IconButton
              aria-label="Next image"
              icon={<ChevronRightIcon />}
              size="sm"
              variant="solid"
              colorScheme="blackAlpha"
              position="absolute"
              top="50%"
              right="2"
              transform="translateY(-50%)"
              zIndex={1}
              pointerEvents="auto"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={next}
            />
          </>
        )}
        {hasMultiple && (
          <Box position="absolute" bottom="2" left="50%" transform="translateX(-50%)" display="flex" gap={1} pointerEvents="none">
            {images.map((_, idx) => (
              <Box
                key={idx}
                w="8px"
                h="8px"
                rounded="full"
                bg={idx === currentIndex ? 'primary' : 'whiteAlpha.700'}
                borderWidth={idx === currentIndex ? '0px' : '1px'}
                borderColor="blackAlpha.400"
              />
            ))}
          </Box>
        )}
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
