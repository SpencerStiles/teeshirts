import { Box, Button, Heading, HStack, Image, LinkBox, LinkOverlay, SimpleGrid, Text } from '@chakra-ui/react';

type FeaturedItem = {
  title: string;
  href: string;
  image: string;
};

const featured: FeaturedItem[] = [
  {
    title: 'SGMSAYS Classic Tee',
    href: '/p/sgmsays-classic-tee',
    image: '/featured1.svg',
  },
  {
    title: 'SGMSAYS Hoodie',
    href: '/p/sgmsays-hoodie',
    image: '/featured2.svg',
  },
  {
    title: 'SGMSAYS Mug',
    href: '/p/sgmsays-mug',
    image: '/featured3.svg',
  },
];

export default function FeaturedRow() {
  return (
    <Box>
      <HStack mb={4}>
        <Heading size="lg">Featured</Heading>
        <Text color="gray.500">Curated picks</Text>
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        {featured.map((item) => (
          <LinkBox key={item.href} as="article" borderWidth="1px" borderRadius="lg" overflow="hidden">
            <Image src={item.image} alt={item.title} w="100%" h="220px" objectFit="cover" />
            <Box p={4}>
              <Heading size="md" noOfLines={1}>
                <LinkOverlay href={item.href}>
                  {item.title}
                </LinkOverlay>
              </Heading>
              <Text color="gray.500" mt={1} noOfLines={2}>
                View details
              </Text>
              <Button as="a" href={item.href} mt={3} colorScheme="teal">
                View Product
              </Button>
            </Box>
          </LinkBox>
        ))}
      </SimpleGrid>
    </Box>
  );
}
