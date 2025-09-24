import { Box, Button, Heading, HStack, Image, LinkBox, LinkOverlay, SimpleGrid, Text } from '@chakra-ui/react';

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
          <LinkBox key={item.slug} as="article" borderWidth="1px" borderRadius="lg" overflow="hidden">
            <Image src={item.image} alt={item.title} w="100%" h="220px" objectFit="cover" />
            <Box p={4}>
              <Heading size="md" noOfLines={1}>
                <LinkOverlay href={`/p/${item.slug}`}>
                  {item.title}
                </LinkOverlay>
              </Heading>
              <Text color="gray.500" mt={1} noOfLines={2}>
                View details
              </Text>
              <Button as="a" href={`/p/${item.slug}`} mt={3} colorScheme="teal">
                View Product
              </Button>
            </Box>
          </LinkBox>
        ))}
      </SimpleGrid>
    </Box>
  );
}
