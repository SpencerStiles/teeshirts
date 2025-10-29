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
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import FeaturedRow from "@/components/FeaturedRow";
import ProductCard from "@/components/ProductCard";
import {
  fetchSpringProductsPage,
  fetchSpringProductsByCategory,
  type SpringProduct,
} from "@/lib/spring";
import { listCatalogDesigns } from "@/lib/catalog";

type CatalogItem = {
  slug: string;
  title: string;
  image: string;
  price?: string;
  category?: string;
};

type Props = {
  items: CatalogItem[];
  page: number;
  hasNext: boolean;
  totalPages: number;
};

export default function ShopPage({ items, page, hasNext, totalPages }: Props) {
  const { colorMode, toggleColorMode } = useColorMode();
  const router = useRouter();
  const categoryFromUrl = (router.query.category as string) || "explore";
  const [activeCategory, setActiveCategory] = useState<string>(categoryFromUrl);

  // Update active category when URL changes
  useEffect(() => {
    setActiveCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  // Deprecated Spring embed controls removed in favor of native grid

  const heroBg = useColorModeValue(
    `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJStksEtGhq98yefXs1KCCKD5YIPs74URQXVu9gpiTpC2TA8JPUD61LXn6x76ZrnduNmFwPBGti_76wTZSslBiATJPbh8FbtLZ7awQkA6vo34qpgKVxtyUAlfBSiw6RpstwMJj1MaXxWoczOuBHdTNKWSX-_00ttFzfvxUdQ3WPTXcBW8-gc_4DaH_p_CEEU7muJ0Bj7b17jnAg9zQmipOvUoLq1OLt7C5Np683rmtafvDm_dKXG2tztwREW9sg5ArFH1lUxdqoZ0")`,
    `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJStksEtGhq98yefXs1KCCKD5YIPs74URQXVu9gpiTpC2TA8JPUD61LXn6x76ZrnduNmFwPBGti_76wTZSslBiATJPbh8FbtLZ7awQkA6vo34qpgKVxtyUAlfBSiw6RpstwMJj1MaXxWoczOuBHdTNKWSX-_00ttFzfvxUdQ3WPTXcBW8-gc_4DaH_p_CEEU7muJ0Bj7b17jnAg9zQmipOvUoLq1OLt7C5Np683rmtafvDm_dKXG2tztwREW9sg5ArFH1lUxdqoZ0")`
  );

  const cardBg = useColorModeValue("background.light", "blackAlpha.600");

  // Filter items by category using the category field from Spring
  const filteredItems =
    activeCategory === "explore"
      ? items
      : items.filter((p) => p.category === activeCategory);

  // Pick first 3 items with images for Featured section from the filtered items
  // Using first 3 instead of random to avoid hydration errors (server/client mismatch)
  const featuredItems = filteredItems
    .filter((p) => !!p.image && p.image.length > 0)
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.title, image: p.image }));

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
          index={["explore", "apparel", "accessories", "drinkware"].indexOf(
            activeCategory
          )}
          onChange={(index) => {
            const categories = [
              "explore",
              "apparel",
              "accessories",
              "drinkware",
            ];
            const newCategory = categories[index];
            setActiveCategory(newCategory);
            // Reset to page 1 when changing categories
            router.push(`/shop?page=1&category=${newCategory}`);
          }}
        >
          <TabList mb={6} flexWrap="wrap" gap={2}>
            <Tab
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Explore
            </Tab>
            <Tab
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Apparel
            </Tab>
            <Tab
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Accessories
            </Tab>
            <Tab
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Drinkware
            </Tab>
          </TabList>

          <TabPanels>
            {["explore", "apparel", "accessories", "drinkware"].map(
              (category) => (
                <TabPanel key={category} px={0}>
                  <SimpleGrid
                    columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
                    spacing={6}
                  >
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
              )
            )}
          </TabPanels>
        </Tabs>
        {/* Enhanced Pagination Controls */}
        <Box w="full" mt={6}>
          <HStack
            spacing={2}
            justify="space-between"
            align="center"
            wrap="wrap"
          >
            {/* First & Previous Buttons */}
            <HStack spacing={2}>
              <Button
                as="a"
                href={`/shop?page=1&category=${activeCategory}`}
                isDisabled={page <= 1}
                variant="outline"
                size="sm"
                aria-label="First page"
              >
                «
              </Button>
              <Button
                as="a"
                href={`/shop?page=${Math.max(
                  1,
                  page - 1
                )}&category=${activeCategory}`}
                isDisabled={page <= 1}
                variant="outline"
              >
                Prev
              </Button>
            </HStack>

            {/* Page Numbers */}
            <HStack
              spacing={1}
              flexWrap="wrap"
              justify="center"
              flex={1}
              mx={2}
            >
              {(() => {
                const buttons: JSX.Element[] = [];
                const maxButtons = 5;
                let start = Math.max(1, page - Math.floor(maxButtons / 2));
                let end = Math.min(totalPages, start + maxButtons - 1);

                if (end - start + 1 < maxButtons) {
                  start = Math.max(1, end - maxButtons + 1);
                }

                // First page + ellipsis
                if (start > 1) {
                  buttons.push(
                    <Button
                      key={1}
                      as="a"
                      href={`/shop?page=1&category=${activeCategory}`}
                      size="sm"
                      variant={1 === page ? "solid" : "outline"}
                      colorScheme={1 === page ? "teal" : undefined}
                    >
                      1
                    </Button>
                  );
                  if (start > 2) {
                    buttons.push(
                      <Text key="start-ellipsis" px={2}>
                        …
                      </Text>
                    );
                  }
                }

                // Page numbers
                for (let p = start; p <= end; p++) {
                  if (p === 1 && start > 1) continue;
                  buttons.push(
                    <Button
                      key={p}
                      as="a"
                      href={`/shop?page=${p}&category=${activeCategory}`}
                      size="sm"
                      variant={p === page ? "solid" : "outline"}
                      colorScheme={p === page ? "teal" : undefined}
                    >
                      {p}
                    </Button>
                  );
                }

                // Last page + ellipsis
                if (end < totalPages) {
                  if (end < totalPages - 1) {
                    buttons.push(
                      <Text key="end-ellipsis" px={2}>
                        …
                      </Text>
                    );
                  }
                  buttons.push(
                    <Button
                      key={totalPages}
                      as="a"
                      href={`/shop?page=${totalPages}&category=${activeCategory}`}
                      size="sm"
                      variant={totalPages === page ? "solid" : "outline"}
                      colorScheme={totalPages === page ? "teal" : undefined}
                    >
                      {totalPages}
                    </Button>
                  );
                }

                return buttons;
              })()}

              {/* Jump to page input */}
              <HStack ml={4} display={{ base: "none", md: "flex" }}>
                <Text whiteSpace="nowrap" fontSize="sm">
                  Go to:
                </Text>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={page}
                  w="70px"
                  size="sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const targetPage = Math.min(
                        totalPages,
                        Math.max(
                          1,
                          parseInt((e.target as HTMLInputElement).value) || 1
                        )
                      );
                      window.location.href = `/shop?page=${targetPage}&category=${activeCategory}`;
                    }
                  }}
                />
              </HStack>
            </HStack>

            {/* Next & Last Buttons */}
            <HStack spacing={2}>
              <Button
                as="a"
                href={`/shop?page=${page + 1}&category=${activeCategory}`}
                isDisabled={!hasNext}
                variant="outline"
              >
                Next
              </Button>
              <Button
                as="a"
                href={`/shop?page=${totalPages}&category=${activeCategory}`}
                isDisabled={!hasNext}
                variant="outline"
                size="sm"
                aria-label="Last page"
              >
                »
              </Button>
            </HStack>
          </HStack>

          {/* Mobile-friendly jump to page */}
          <HStack mt={4} w="full" display={{ base: "flex", md: "none" }}>
            <Text whiteSpace="nowrap" fontSize="sm">
              Go to page:
            </Text>
            <Input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={page}
              flex={1}
              size="sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const targetPage = Math.min(
                    totalPages,
                    Math.max(
                      1,
                      parseInt((e.target as HTMLInputElement).value) || 1
                    )
                  );
                  window.location.href = `/shop?page=${targetPage}&category=${activeCategory}`;
                }
              }}
            />
          </HStack>
        </Box>
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
  const pageParam = Array.isArray(ctx.query.page)
    ? ctx.query.page[0]
    : ctx.query.page;
  const categoryParam = Array.isArray(ctx.query.category)
    ? ctx.query.category[0]
    : ctx.query.category;
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const category = categoryParam || "explore";
  const ITEMS_PER_PAGE = 16;

  try {
    const catalogDesigns = await listCatalogDesigns();
    if (catalogDesigns.length > 0) {
      const normalized: CatalogItem[] = catalogDesigns.map((design) => ({
        slug: design.slug,
        title: design.title,
        image: design.heroImage,
        category: design.category,
      }));

      const byCategory =
        category === "explore"
          ? normalized
          : normalized.filter((d) => d.category === category);

      const totalPages = Math.max(
        1,
        Math.ceil(byCategory.length / ITEMS_PER_PAGE)
      );
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const paginatedItems = byCategory.slice(
        startIndex,
        startIndex + ITEMS_PER_PAGE
      );
      const hasNext = page < totalPages;

      return {
        props: {
          items: paginatedItems,
          page,
          hasNext,
          totalPages,
        },
      };
    }
  } catch (err) {
    console.warn("Failed to load springCatalog dataset", err);
  }

  try {
    let allItems: SpringProduct[] = [];

    if (category === "explore") {
      // For "Explore", fetch all categories from all their pages
      const fetchAllPages = async (
        cat: "apparel" | "accessories" | "drinkware"
      ) => {
        const items: SpringProduct[] = [];
        const seenSlugs = new Set<string>();
        let currentPage = 1;
        let hasMore = true;

        while (hasMore && currentPage <= 10) {
          // Limit to 10 pages per category to avoid infinite loops
          const result = await fetchSpringProductsByCategory(cat, currentPage);

          // Check if we're getting new items or just duplicates
          let newItemsCount = 0;
          for (const item of result.items) {
            if (!seenSlugs.has(item.slug)) {
              seenSlugs.add(item.slug);
              items.push(item);
              newItemsCount++;
            }
          }

          // If we got no new items, stop fetching (pagination is just repeating)
          if (newItemsCount === 0) {
            break;
          }

          hasMore = result.hasNext;
          currentPage++;
        }
        return items;
      };

      const [apparelItems, accessoriesItems, drinkwareItems] =
        await Promise.all([
          fetchAllPages("apparel"),
          fetchAllPages("accessories"),
          fetchAllPages("drinkware"),
        ]);

      allItems = [...apparelItems, ...accessoriesItems, ...drinkwareItems];
    } else {
      // For specific category, fetch all pages from that category
      const validCategory = ["apparel", "accessories", "drinkware"].includes(
        category
      )
        ? (category as "apparel" | "accessories" | "drinkware")
        : "apparel";

      const seenSlugs = new Set<string>();
      let currentPage = 1;
      let hasMore = true;

      while (hasMore && currentPage <= 10) {
        // Limit to 10 pages to avoid infinite loops
        const result = await fetchSpringProductsByCategory(
          validCategory,
          currentPage
        );

        // Check if we're getting new items or just duplicates
        let newItemsCount = 0;
        for (const item of result.items) {
          if (!seenSlugs.has(item.slug)) {
            seenSlugs.add(item.slug);
            allItems.push(item);
            newItemsCount++;
          }
        }

        // If we got no new items, stop fetching (pagination is just repeating)
        if (newItemsCount === 0) {
          break;
        }

        hasMore = result.hasNext;
        currentPage++;
      }
    }

    // Deduplicate by design - keep only one product per design (title)
    // Group by normalized title and keep the first one
    const uniqueDesigns = new Map<string, SpringProduct>();
    for (const item of allItems) {
      const designKey = item.title.toLowerCase().trim();
      if (!uniqueDesigns.has(designKey)) {
        uniqueDesigns.set(designKey, item);
      }
    }
    const deduplicatedItems = Array.from(uniqueDesigns.values());

    // Now paginate the deduplicated results into chunks of ITEMS_PER_PAGE
    const totalPages = Math.ceil(deduplicatedItems.length / ITEMS_PER_PAGE); // >=1 when items exist, else 0
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = deduplicatedItems
      .slice(startIndex, endIndex)
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        image: item.image,
        price: item.price,
        category: item.category,
      }));
    const hasNext = page < totalPages;

    return {
      props: {
        items: paginatedItems,
        page,
        hasNext,
        totalPages,
      },
    };
  } catch (e) {
    return { props: { items: [], page, hasNext: false, totalPages: 1 } };
  }
};
