import {
  Box,
  Heading,
  HStack,
  Spacer,
  Button,
  useColorMode,
  VStack,
  Text,
  SimpleGrid,
  LinkBox,
  LinkOverlay,
  Stack,
  Input,
  useColorModeValue,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import type { GetServerSideProps } from "next";
import { useState } from "react";
import FeaturedRow from "@/components/FeaturedRow";
import ProductCard from "@/components/ProductCard";
import { fetchSpringProductsPage, type SpringProduct } from "@/lib/spring";

type Props = { items: SpringProduct[]; page: number; hasNext: boolean; totalPages: number };

export default function ShopPage({ items, page, hasNext, totalPages }: Props) {
  const { colorMode, toggleColorMode } = useColorMode();
  const [activeCategory, setActiveCategory] = useState<string>('explore');
  // Deprecated Spring embed controls removed in favor of native grid

  const heroBg = useColorModeValue(
    `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJStksEtGhq98yefXs1KCCKD5YIPs74URQXVu9gpiTpC2TA8JPUD61LXn6x76ZrnduNmFwPBGti_76wTZSslBiATJPbh8FbtLZ7awQkA6vo34qpgKVxtyUAlfBSiw6RpstwMJj1MaXxWoczOuBHdTNKWSX-_00ttFzfvxUdQ3WPTXcBW8-gc_4DaH_p_CEEU7muJ0Bj7b17jnAg9zQmipOvUoLq1OLt7C5Np683rmtafvDm_dKXG2tztwREW9sg5ArFH1lUxdqoZ0")`,
    `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJStksEtGhq98yefXs1KCCKD5YIPs74URQXVu9gpiTpC2TA8JPUD61LXn6x76ZrnduNmFwPBGti_76wTZSslBiATJPbh8FbtLZ7awQkA6vo34qpgKVxtyUAlfBSiw6RpstwMJj1MaXxWoczOuBHdTNKWSX-_00ttFzfvxUdQ3WPTXcBW8-gc_4DaH_p_CEEU7muJ0Bj7b17jnAg9zQmipOvUoLq1OLt7C5Np683rmtafvDm_dKXG2tztwREW9sg5ArFH1lUxdqoZ0")`
  );

  const cardBg = useColorModeValue("background.light", "blackAlpha.600");

  // Pick first 3 items with images for Featured section
  const featuredItems = items
    .filter((p) => !!p.image)
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.title, image: p.image }));

  // Category filtering logic (basic keyword matching)
  const filterByCategory = (products: SpringProduct[], category: string) => {
    if (category === 'explore') return products;
    
    const keywords: Record<string, string[]> = {
      apparel: ['shirt', 't-shirt', 'tee', 'hoodie', 'sweatshirt', 'tank', 'long sleeve', 'pants', 'athletic'],
      accessories: ['hat', 'cap', 'bag', 'sticker', 'stationery', 'accessory'],
      drinkware: ['mug', 'cup', 'bottle', 'tumbler', 'drinkware'],
    };
    
    const categoryKeywords = keywords[category] || [];
    return products.filter(p => {
      const title = p.title.toLowerCase();
      return categoryKeywords.some(keyword => title.includes(keyword));
    });
  };

  const filteredItems = filterByCategory(items, activeCategory);

  return (
    <VStack align="stretch" spacing={10}>
      {/* Hero */}
      <Box
        className="distressed-texture"
        position="relative"
        minH={{ base: "60vh" }}
        rounded="xl"
        bgImage={heroBg}
        bgSize="cover"
        bgPos="center"
        color="white"
        textAlign="center"
        px={8}
        py={16}
        shadow="2xl"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack zIndex={1} spacing={6}>
          <Heading
            textTransform="uppercase"
            letterSpacing="widest"
            fontWeight="bold"
            size={{ base: "2xl", sm: "3xl", lg: "4xl" }}
            lineHeight="1.1"
            textShadow="0 2px 8px rgba(0,0,0,0.5)"
          >
            Gear Up. Survive.
          </Heading>
          <Text
            maxW="2xl"
            mx="auto"
            fontSize="lg"
            color="gray.300"
            textShadow="0 1px 3px rgba(0,0,0,0.4)"
          >
            Patriotic apparel for everyone - men and women - made for everyday
            wear. Stand for what you love, comfortably.
          </Text>
          <Button
            as="a"
            href="#catalog"
            rounded="full"
            bg="primary"
            color="white"
            px={8}
            py={3}
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            size="md"
            _hover={{ transform: "scale(1.03)" }}
            transition="transform 0.15s ease"
          >
            Shop Now
          </Button>
        </VStack>
      </Box>

      {/* Featured (dynamic) */}
      <Box>
        <HStack mb={4}>
          <Heading size="lg" textTransform="uppercase" letterSpacing="wider">
            Featured Apparel
          </Heading>
        </HStack>
        <FeaturedRow items={featuredItems} />
      </Box>

      {/* Category Tabs & Catalog Grid */}
      <Box id="catalog">
        <HStack mb={6}>
          <Heading size="lg" textTransform="uppercase" letterSpacing="wider">
            Shop Apparel
          </Heading>
          <Spacer />
          <Button onClick={toggleColorMode} variant="outline">
            {colorMode === "dark" ? "Light mode" : "Dark mode"}
          </Button>
        </HStack>

        <Tabs 
          variant="soft-rounded" 
          colorScheme="red"
          onChange={(index) => {
            const categories = ['explore', 'apparel', 'accessories', 'drinkware'];
            setActiveCategory(categories[index]);
          }}
        >
          <TabList mb={6} flexWrap="wrap" gap={2}>
            <Tab fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
              Explore
            </Tab>
            <Tab fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
              Apparel
            </Tab>
            <Tab fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
              Accessories
            </Tab>
            <Tab fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
              Drinkware
            </Tab>
          </TabList>

          <TabPanels>
            {['explore', 'apparel', 'accessories', 'drinkware'].map((category) => (
              <TabPanel key={category} px={0}>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
                  {filteredItems.map((p) => (
                    <ProductCard
                      key={p.slug}
                      product={{
                        slug: p.slug,
                        title: p.title,
                        image: p.image,
                        price: p.price,
                      }}
                    />
                  ))}
                </SimpleGrid>
                {filteredItems.length === 0 && (
                  <Box textAlign="center" py={12}>
                    <Text fontSize="lg" color="gray.500">
                      No products found in this category.
                    </Text>
                  </Box>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
        {/* Pagination controls */}
        <HStack mt={6} justify="space-between" align="center" wrap="wrap" gap={2}>
          <Button as="a" href={`/shop?page=${Math.max(1, page - 1)}`} isDisabled={page <= 1} variant="outline">
            Prev
          </Button>
          <HStack>
            {(() => {
              const buttons: JSX.Element[] = [];
              const maxButtons = 9; // window size
              let start = Math.max(1, page - Math.floor(maxButtons / 2));
              let end = Math.min(totalPages, start + maxButtons - 1);
              if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
              if (start > 1) buttons.push(<Text key="first">…</Text>);
              for (let p = start; p <= end; p++) {
                buttons.push(
                  <Button
                    key={p}
                    as="a"
                    href={`/shop?page=${p}`}
                    size="sm"
                    variant={p === page ? 'solid' : 'outline'}
                    colorScheme={p === page ? 'teal' : undefined}
                  >
                    {p}
                  </Button>
                );
              }
              if (end < totalPages) buttons.push(<Text key="last">…</Text>);
              return buttons;
            })()}
          </HStack>
          <Button as="a" href={`/shop?page=${page + 1}`} isDisabled={!hasNext} variant="outline">
            Next
          </Button>
        </HStack>
      </Box>

      {/* Categories */}
      {false && (
        <Box>
          <Heading
            mb={8}
            textAlign="center"
            size="lg"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            Shop by Category
          </Heading>
          <SimpleGrid
            columns={{ base: 2, sm: 3, lg: 5 }}
            gap={{ base: 4, md: 6 }}
          >
            {[
              {
                label: "Survival",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA20Xnm_TeXwxomyoxvujl70S6k91z2VZEgO8Agah7mzTOsQfocaTfMt2oMXxlg7p_pTY0nN_2yxUnlFC_IOJejLqOx-38bgdQAp1iwOEYpDSYo4zK6nClmy0LrVJtQXB_UKXKnGN9z9Zc2krS5WEjskJj1U6DgmXaDi0Tcpoqo2BJCVHE9TZi_qWYNEJBIq9jhT3oGOagK1pPOuNlJ7xNIvycdkCuXyLP2glb3IKIja1ZOonoFJ8j3UpeyVxKOrb5yajPGNhNz1T8",
              },
              {
                label: "Camping",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDeY3nKiVtOjCF2CyuWrjMH2heyDx9o7XHMjv-zD8yCq7l0XvY14YwwPvdt61FzikqO9Zl5rM4Z9iP7zR6obfWmqQV14pzvfh0NjXLF7rBPZid9aDkUaPzAeojL4C28wZSyFrm2UlgTVDXY9HJHi3TyYgPHX4014RbbYKXpp1dKPxg4ZNstxELDFADgSPno8qyb17he9M2yFOJ0NpBKg5CZw5cwWhXvfCcl1n4s-s2pSyXQGS9ZjPAYIdia5xpHk4esOLV3tljWD6E",
              },
              {
                label: "Self-Defense",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBBG9FG0rvVHUUH_nq8ftOYh5C-j0o2lVNPzR6EPhj1d9ZXZKi-GKQ2PYwdKuFroUPGh-oTCJnU-1R0CK_tNq5OT9s178lY_IXG9z4mIcrN5Q5w3MVqDbNPoICgWqmIO1R3POLTrtqJc64V6JtXA6Rm6loUwa7VRo6QIA36FJIlxYCYCpOpSD84tizykAAVmg_aq5w-yeZCq0IFObOE5YwEg1PCwRruz0W1HXZjLjKdVZZixpRgbvhip8sgvu3_gfgyXPtsqKxc9zo",
              },
              {
                label: "Apparel",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuChkrZhDvFh1UNZA-CJCzRRJIFnQI7-oRE4RBTE7cVmgumQB1eYF9IYMdFNliSZIKYse4U54CVRyEPux-fjj9IKUoIdC_RaicX2otpo_Yyzh_E9edLuJMUAgSCK7cPjcSHu_ZaVEBxd9lWqBBw6JMe8rxknwfbgP13T-XCjpJcPA2oLpb_WaRHNk8V97pr7JHVmlCFKfGn_vyy1ch4fy88fVru2B9G0W9nZ82p1WaQOE3cKhH2hAMZErcs6sBL-MJeY6UxtAGuJPsk",
              },
              {
                label: "Accessories",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWmXibPm7KsGCkKYAdpwFenQs15wJ8D_OslI_QYpfqdd9BrFLRA5Wuwfsaz0l19oj76PhoQGtXlKlIYSo2TzqAhHl-CXetO9mnvldT-qi9WqnP0wxne7oiVB7k-KWzafvK5_c7jNP2TSxVZ0SF3HqdvDKosM7qz7J3RiTuH4wwNlNWWE-LuoARPY2b30bA6SGXsN5ny5nx6zoAEZR2s4P3P8yqUSUbSaYYeKu6DZgeyJb0FrGa-j34pzP1-sNDUu6aJQoqm08Lu0E",
              },
            ].map((c) => (
              <LinkBox
                key={c.label}
                position="relative"
                overflow="hidden"
                rounded="lg"
                role="group"
              >
                <Box
                  h="48"
                  w="full"
                  bgImage={`url('${c.img}')`}
                  bgSize="cover"
                  bgPos="center"
                  transition="transform 0.3s"
                  _groupHover={{ transform: "scale(1.05)" }}
                />
                <Box
                  position="absolute"
                  inset={0}
                  bg="blackAlpha.500"
                  _groupHover={{ bg: "blackAlpha.700" }}
                />
                <Heading
                  position="absolute"
                  bottom={4}
                  left={4}
                  size="md"
                  color="white"
                >
                  <LinkOverlay href="#">{c.label}</LinkOverlay>
                </Heading>
              </LinkBox>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Newsletter callout */}
      {false && (
        <Box
          className="distressed-texture"
          position="relative"
          overflow="hidden"
          rounded="xl"
          p={{ base: 8, sm: 12, lg: 16 }}
          textAlign="center"
          bg={useColorModeValue("gray.200", "blackAlpha.500")}
        >
          <VStack spacing={4}>
            <Heading size="lg" textTransform="uppercase" letterSpacing="wider">
              Stay Prepared
            </Heading>
            <Text
              maxW="2xl"
              mx="auto"
              color={useColorModeValue("gray.700", "gray.300")}
            >
              Sign up for our newsletter to get the latest gear updates and
              survival tips.
            </Text>
            <Stack
              direction={{ base: "column", sm: "row" }}
              maxW="md"
              w="full"
              mt={2}
              spacing={2}
            >
              <Input
                type="email"
                placeholder="Enter your email"
                rounded="full"
                bg={useColorModeValue("background.light", "background.dark")}
                borderColor="primary"
                _focusVisible={{
                  borderColor: "primary",
                  boxShadow: "0 0 0 1px var(--chakra-colors-primary)",
                }}
              />
              <Button
                type="submit"
                rounded="full"
                bg="primary"
                color="white"
                px={8}
                py={3}
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing="wider"
              >
                Subscribe
              </Button>
            </Stack>
          </VStack>
        </Box>
      )}
    </VStack>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const pageParam = Array.isArray(ctx.query.page) ? ctx.query.page[0] : ctx.query.page;
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  try {
    // Aggregate multiple Spring pages to show ~12 items per app page
    const SPRING_PAGES_PER_VIEW = 4; // adjust if Spring changes per-page count
    const start = (page - 1) * SPRING_PAGES_PER_VIEW + 1;
    const promises = Array.from({ length: SPRING_PAGES_PER_VIEW }, (_, i) => fetchSpringProductsPage(start + i));
    const results = await Promise.all(promises);
    const items = results.flatMap(r => r.items);
    const hasNext = results[results.length - 1]?.hasNext ?? false;
    // totalPages from the last Spring page we loaded; multiply by our aggregation window if desired
    const lastTotal = results[results.length - 1]?.totalPages ?? page;
    return { props: { items, page, hasNext, totalPages: lastTotal } };
  } catch (e) {
    return { props: { items: [], page, hasNext: false, totalPages: page } };
  }
};
