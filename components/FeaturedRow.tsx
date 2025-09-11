import { Box, Button, Heading, HStack, Image, LinkBox, LinkOverlay, SimpleGrid, Text } from '@chakra-ui/react';

type FeaturedItem = {
  title: string;
  href: string;
  image: string;
};

const featured: FeaturedItem[] = [
  {
    title: 'SGMSAYS Classic Tee',
    href: 'https://sgt-major-says.creator-spring.com/listing/get-sgmsays?product=14',
    image: '/featured1.svg',
  },
  {
    title: 'SGMSAYS Hoodie',
    href: 'https://sgt-major-says.creator-spring.com/listing/get-sgmsays?product=1912',
    image: '/featured2.svg',
  },
  {
    title: 'SGMSAYS Mug',
    href: 'https://sgt-major-says.creator-spring.com/listing/new-sgmsays?product=1896',
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
                <LinkOverlay href={item.href} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </LinkOverlay>
              </Heading>
              <Text color="gray.500" mt={1} noOfLines={2}>
                View on Spring
              </Text>
              <Button as="a" href={item.href} target="_blank" rel="noopener noreferrer" mt={3} colorScheme="teal">
                Buy on Spring
              </Button>
            </Box>
          </LinkBox>
        ))}
      </SimpleGrid>
    </Box>
  );
}
