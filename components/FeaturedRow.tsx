import { Box, Button, Heading, HStack, Image, LinkBox, LinkOverlay, SimpleGrid, Text, IconButton } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';

type FeaturedItem = {
  slug: string;
  title: string;
  image: string;
};

interface Props {
  items?: FeaturedItem[];
}

// Fallback static items if no dynamic items are provided
const fallbackItems: FeaturedItem[] = [
  { slug: 'sgmsays-classic-tee', title: 'SGMSAYS Classic Tee', image: '/featured1.svg' },
  { slug: 'sgmsays-hoodie', title: 'SGMSAYS Hoodie', image: '/featured2.svg' },
  { slug: 'sgmsays-mug', title: 'SGMSAYS Mug', image: '/featured3.svg' },
];

export default function FeaturedRow({ items }: Props) {
  const list = (items && items.length > 0 ? items : fallbackItems).slice(0, 3);
  return (
    <Box>
      <HStack mb={4}>
        <Heading size="lg">Featured</Heading>
        <Text color="gray.500">Curated picks</Text>
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        {list.map((item) => (
          <FeaturedCard key={item.slug} item={item} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

function FeaturedCard({ item }: { item: FeaturedItem }) {
  const [images, setImages] = useState<string[]>([item.image]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/product-images?slug=${encodeURIComponent(item.slug)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.images) && data.images.length > 0) {
          setImages(data.images);
          setIdx(0);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [item.slug]);

  const hasMultiple = images.length > 1;
  const prev = (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); };
  const next = (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setIdx((i) => (i + 1) % images.length); };

  return (
    <LinkBox as="article" borderWidth="1px" borderRadius="lg" overflow="hidden" role="group">
      <Box position="relative" h="220px" w="100%" overflow="hidden" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <Image src={images[idx] || item.image} alt={item.title} w="100%" h="100%" objectFit="cover" transition="transform 0.4s" _groupHover={{ transform: 'scale(1.02)' }} />
        {hasMultiple && (
          <>
            <IconButton aria-label="Previous image" icon={<ChevronLeftIcon />} size="sm" variant="solid" colorScheme="blackAlpha" position="absolute" top="50%" left="2" transform="translateY(-50%)" zIndex={1} pointerEvents="auto" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={prev} />
            <IconButton aria-label="Next image" icon={<ChevronRightIcon />} size="sm" variant="solid" colorScheme="blackAlpha" position="absolute" top="50%" right="2" transform="translateY(-50%)" zIndex={1} pointerEvents="auto" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={next} />
            <Box position="absolute" bottom="2" left="50%" transform="translateX(-50%)" display="flex" gap={1} pointerEvents="none">
              {images.map((_, i) => (
                <Box key={i} w="8px" h="8px" rounded="full" bg={i === idx ? 'primary' : 'whiteAlpha.700'} borderWidth={i === idx ? '0px' : '1px'} borderColor="blackAlpha.400" />
              ))}
            </Box>
          </>
        )}
      </Box>
      <Box p={4}>
        <Heading size="md" noOfLines={1}>
          <LinkOverlay href={`/p/${item.slug}`}>{item.title}</LinkOverlay>
        </Heading>
        <Text color="gray.500" mt={1} noOfLines={2}>View details</Text>
        <Button as="a" href={`/p/${item.slug}`} mt={3} colorScheme="teal">View Product</Button>
      </Box>
    </LinkBox>
  );
}
