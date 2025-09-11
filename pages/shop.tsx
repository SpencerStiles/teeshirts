import { useMemo, useState } from 'react';
import { Box, Heading, HStack, Select, Spacer, Button, useColorMode, VStack, Text } from '@chakra-ui/react';
import StoreEmbed from '@/components/StoreEmbed';
import FeaturedRow from '@/components/FeaturedRow';

export default function ShopPage() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [per, setPer] = useState(24);
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<'grid-sm-4' | 'grid-sm-3' | 'grid-sm-2'>('grid-sm-4');

  const themeParam = colorMode === 'dark' ? 'dark' : 'light';

  const src = useMemo(() => {
    const url = new URL('https://embed.creator-spring.com/widget');
    url.searchParams.set('slug', 'sgt-major-says');
    url.searchParams.set('per', String(per));
    url.searchParams.set('page', String(page));
    url.searchParams.set('layout', layout);
    url.searchParams.set('theme', themeParam);
    // leave currency empty so Spring auto-detects
    url.searchParams.set('currency', '');
    return url.toString();
  }, [per, page, layout, themeParam]);

  return (
    <VStack align="stretch" spacing={10}>
      <Box>
        <Heading size="2xl" mb={2}>SGT Major Says Shop</Heading>
        <Text color="gray.500">Browse official merch. Featured picks below, full catalog follows.</Text>
      </Box>

      <FeaturedRow />

      <Box>
        <HStack spacing={4} mb={4}>
          <HStack>
            <Text fontWeight="semibold">Items per page</Text>
            <Select w="auto" value={per} onChange={(e) => setPer(Number(e.target.value))}>
              {[12, 24, 30, 48].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </HStack>
          <HStack>
            <Text fontWeight="semibold">Layout</Text>
            <Select w="auto" value={layout} onChange={(e) => setLayout(e.target.value as any)}>
              <option value="grid-sm-2">2 cols</option>
              <option value="grid-sm-3">3 cols</option>
              <option value="grid-sm-4">4 cols</option>
            </Select>
          </HStack>
          <Spacer />
          <Button onClick={toggleColorMode} variant="outline">
            {colorMode === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        </HStack>
        <StoreEmbed src={src} />
      </Box>
    </VStack>
  );
}
