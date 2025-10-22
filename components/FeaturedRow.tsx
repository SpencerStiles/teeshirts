import { Box, Button, Heading, HStack, Image, LinkBox, LinkOverlay, SimpleGrid, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { humanizeSlugTitle } from '@/lib/title';

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
  const list = (items && items.length > 0 ? items : fallbackItems)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      title: humanizeSlugTitle(item.title, item.slug),
    }));
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
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Disable additional image fetching for now
    // The API can't reliably match products with the new slug format
    // Keep the initial item.image which is correct from the category page
    let cancelled = false;
    return () => { cancelled = true; };
  }, [item.slug]);

  // Show front image by default, back image on hover (if available)
  const displayImage = isHovered && images.length > 1 ? images[1] : images[0] || item.image;
  
  return (
    <LinkBox 
      as="article" 
      borderWidth="1px" 
      borderRadius="lg" 
      overflow="hidden" 
      role="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box position="relative" h="220px" w="100%" overflow="hidden">
        <Image 
          src={displayImage} 
          alt={item.title} 
          w="100%" 
          h="100%" 
          objectFit="cover" 
          transition="opacity 0.3s ease-in-out" 
          _groupHover={{ transform: 'scale(1.02)' }} 
        />
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
