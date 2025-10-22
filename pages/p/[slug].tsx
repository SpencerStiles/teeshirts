import { GetServerSideProps } from 'next';
import { Box, Button, Container, Heading, Image, Stack, Text, VStack, HStack, VisuallyHidden } from '@chakra-ui/react';
import Link from 'next/link';
import { fetchSpringProductVariants } from '@/lib/spring';
import { getCatalogDesign, type CatalogVariant as StoredCatalogVariant } from '@/lib/catalog';
import { products as fallbackProducts } from '@/data/products';
import { useEffect, useMemo, useState } from 'react';
import { humanizeSlugTitle } from '@/lib/title';

type Variant = StoredCatalogVariant & { slug: string };

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#1a202c',
  white: '#ffffff',
  navy: '#1a365d',
  red: '#c53030',
  blue: '#2b6cb0',
  royal: '#4169e1',
  green: '#2f855a',
  olive: '#556b2f',
  grey: '#a0aec0',
  gray: '#a0aec0',
  charcoal: '#4a5568',
  silver: '#d1d5db',
  gold: '#b7791f',
  pink: '#d53f8c',
  purple: '#805ad5',
  orange: '#dd6b20',
  yellow: '#d69e2e',
  maroon: '#822727',
  brown: '#744210',
  teal: '#2c7a7b',
  aqua: '#319795',
  cyan: '#0bc5ea',
  magenta: '#d61f69',
  burgundy: '#63171b',
  tan: '#d0b49f',
  khaki: '#b59267',
  cream: '#fef9ef',
  ivory: '#fdf8f2',
  beige: '#fbd38d',
  lavender: '#b794f4',
  violet: '#7f55d6',
  plum: '#5c247a',
  turquoise: '#38b2ac',
  coral: '#f56565',
  mint: '#81e6d9',
  peach: '#f6ad55',
  sand: '#f4e4bc',
  rose: '#f687b3',
  sky: '#63b3ed',
  indigo: '#5a67d8',
  midnight: '#1a202c',
  graphite: '#434558',
  steel: '#718096',
  bronze: '#946c38',
  forest: '#22543d',
  army: '#4b5320',
  camo: '#6b8e23',
  heather: '#b8c2cc',
  limestone: '#d2d6dc',
  desert: '#c9a36b',
  ash: '#cbd5e0',
  slate: '#5f6c80',
  sapphire: '#276ef1',
  cardinal: '#c53030',
  crimson: '#dc143c',
  burg: '#63171b',
  hunter: '#22543d',
  moss: '#475d3c',
  ice: '#e6fffa',
  cobalt: '#0047ab',
};

function normalizeKey(value?: string): string | null {
  if (!value) return null;
  const key = value.toString().trim().toLowerCase();
  if (!key) return null;
  return key;
}

function extractLabelParts(label: string): { productType: string; color?: string } {
  const segments = label.split(' - ').map((part) => part.trim()).filter(Boolean);
  if (segments.length <= 1) {
    return { productType: label.trim(), color: undefined };
  }
  return {
    productType: segments.slice(0, -1).join(' - '),
    color: segments[segments.length - 1],
  };
}

function getProductTypeName(variant: Variant, fallbackTitle: string): string {
  const explicit = normalizeKey(variant.productType ?? '');
  if (explicit) return variant.productType as string;
  const parts = extractLabelParts(variant.label);
  return parts.productType || fallbackTitle;
}

function getColorName(variant?: Variant): string | undefined {
  if (!variant) return undefined;
  if (variant.colorName) return variant.colorName;
  const parts = extractLabelParts(variant.label);
  return parts.color;
}

function resolveColorHex(explicitHex?: string, colorName?: string): string | undefined {
  if (explicitHex) return explicitHex;
  const key = normalizeKey(colorName ?? '');
  if (!key) return undefined;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  if (COLOR_HEX_MAP[key]) return COLOR_HEX_MAP[key];
  const simple = key.replace(/\s+/g, '');
  if (COLOR_HEX_MAP[simple]) return COLOR_HEX_MAP[simple];
  return undefined;
}

interface Props {
  product: { slug: string; title: string; image: string; price?: string | null } | null;
  variants: Variant[];
}

export default function ProductPage({ product, variants }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    variants.length > 0 ? variants[0] : null
  );
  const [selectedProductType, setSelectedProductType] = useState<string | null>(
    variants.length > 0 ? getProductTypeName(variants[0], product?.title ?? '') : null
  );

  const displayTitle = product ? humanizeSlugTitle(product.title, product.slug) : '';

  const enrichedVariants = useMemo(() => {
    return variants.map((variant) => {
      const productTypeName = getProductTypeName(variant, product?.title ?? '');
      const colorName = getColorName(variant);
      const colorHex = resolveColorHex(variant.colorHex, colorName);
      return {
        ...variant,
        productType: productTypeName,
        colorName: colorName,
        colorHex: colorHex,
      };
    });
  }, [variants, product?.title]);

  const variantGroups = useMemo(() => {
    const groups = new Map<string, Variant[]>();
    for (const variant of enrichedVariants) {
      const key = variant.productType ?? product?.title ?? 'Default';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(variant);
    }
    return Array.from(groups.entries()).map(([productTypeName, list]) => ({ productTypeName, variants: list }));
  }, [enrichedVariants, product?.title]);

  const selectedGroup = useMemo(() => {
    if (variantGroups.length === 0) return null;
    const key = selectedProductType ?? (selectedVariant ? getProductTypeName(selectedVariant, product?.title ?? '') : variantGroups[0].productTypeName);
    return variantGroups.find((group) => group.productTypeName === key) ?? variantGroups[0];
  }, [variantGroups, selectedProductType, selectedVariant, product?.title]);

  useEffect(() => {
    if (!selectedGroup || selectedGroup.variants.length === 0) {
      if (selectedVariant !== null) {
        setSelectedVariant(null);
      }
      return;
    }
    const found = selectedGroup.variants.find((variant) => variant.productId === selectedVariant?.productId);
    if (found && found !== selectedVariant) {
      setSelectedVariant(found);
      return;
    }
    if (!found) {
      setSelectedVariant(selectedGroup.variants[0] ?? null);
    }
  }, [selectedGroup, selectedVariant]);

  if (!product) {
    return (
      <Container maxW="2xl" py={16}>
        <Heading size="lg" mb={4}>Product not found</Heading>
        <Button as={Link} href="/shop" colorScheme="gray">Back to shop</Button>
      </Container>
    );
  }

  const buyUrl = selectedVariant?.springUrl || `/go/${product.slug}`;
  const displayImage = selectedVariant?.image || product.image;
  const displayPrice = selectedVariant?.price || product.price || null;
  const selectedColorName = selectedVariant ? getColorName(selectedVariant) : undefined;

  return (
    <Container maxW="6xl" py={10}>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={8} align="flex-start">
        <Box flex="1" overflow="hidden" borderRadius="xl" borderWidth="1px">
          <Image 
            src={displayImage} 
            alt={selectedVariant?.label || product.title} 
            w="100%" 
            h="auto" 
            maxH="600px"
            objectFit="contain" 
            bg="gray.50"
            _dark={{ bg: 'gray.800' }}
          />
        </Box>
        
        <VStack align="stretch" spacing={6} flex="1">
          <Heading size="xl" textTransform="none">{displayTitle || product.title}</Heading>
          {displayPrice && <Text fontSize="lg" color="gray.400">{displayPrice}</Text>}
          <Text color="gray.500">High-quality patriotic apparel for men and women. Ships globally via Spring.</Text>
          
          {variantGroups.length > 0 && (
            <Box>
              {variantGroups.length > 1 && (
                <Box>
                  <Text fontWeight="bold" mb={3} textTransform="uppercase" fontSize="sm" letterSpacing="wide">
                    Select Style
                  </Text>
                  <HStack spacing={2} flexWrap="wrap">
                    {variantGroups.map((group) => {
                      const isActive = selectedGroup?.productTypeName === group.productTypeName;
                      return (
                        <Button
                          key={group.productTypeName}
                          variant={isActive ? 'solid' : 'outline'}
                          colorScheme={isActive ? 'red' : 'gray'}
                          size="sm"
                          onClick={() => {
                            setSelectedProductType(group.productTypeName);
                            setSelectedVariant(group.variants[0] ?? null);
                          }}
                        >
                          {humanizeSlugTitle(group.productTypeName, group.productTypeName)}
                        </Button>
                      );
                    })}
                  </HStack>
                </Box>
              )}

              {selectedGroup && selectedGroup.variants.length > 0 && (
                <Box mt={variantGroups.length > 1 ? 6 : 0}>
                  <Text fontWeight="bold" mb={3} textTransform="uppercase" fontSize="sm" letterSpacing="wide">
                    Select Color
                  </Text>
                  <HStack spacing={3} flexWrap="wrap">
                    {selectedGroup.variants.map((variant) => {
                      const isActive = selectedVariant?.productId === variant.productId;
                      const swatchColor = variant.colorHex || resolveColorHex(undefined, getColorName(variant));
                      const bgColor = swatchColor || 'gray.400';
                      const borderColor = isActive ? 'primary' : 'gray.300';
                      return (
                        <Button
                          key={`${variant.productId}-${variant.slug}`}
                          variant="outline"
                          p="0"
                          minW="36px"
                          h="36px"
                          borderRadius="full"
                          borderWidth={isActive ? '3px' : '2px'}
                          borderColor={borderColor}
                          bg={bgColor}
                          _dark={{ borderColor: borderColor, bg: bgColor }}
                          _hover={{ opacity: 0.85 }}
                          onClick={() => setSelectedVariant(variant)}
                        >
                          <VisuallyHidden>{getColorName(variant) || variant.label}</VisuallyHidden>
                        </Button>
                      );
                    })}
                  </HStack>
                  {selectedColorName && (
                    <Text fontSize="sm" color="gray.500" mt={2}>
                      Color: {selectedColorName}
                    </Text>
                  )}
                </Box>
              )}
            </Box>
          )}
          
          <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} pt={2}>
            <Button 
              as="a" 
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              rounded="full" 
              bg="primary" 
              color="white" 
              fontWeight="bold" 
              textTransform="uppercase" 
              letterSpacing="wider"
            >
              Buy on Spring
            </Button>
            <Button as={Link} href="/shop" variant="outline" rounded="full">Back to Catalog</Button>
          </Stack>
        </VStack>
      </Stack>
    </Container>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string | undefined;
  if (!slug) return { props: { product: null, variants: [] } };

  try {
    const catalogDesign = await getCatalogDesign(slug);
    if (catalogDesign) {
      const variants: Variant[] = catalogDesign.variants.map((variant) => ({
        ...variant,
        slug: `${catalogDesign.slug}-${variant.productId}`,
      }));
      const primaryVariant = variants[0];
      return {
        props: {
          product: {
            slug: catalogDesign.slug,
            title: catalogDesign.title,
            image: catalogDesign.heroImage,
            price: primaryVariant?.price ?? null,
          },
          variants,
        },
      };
    }
  } catch (err) {
    console.warn('Failed to read springCatalog dataset for product', slug, err);
  }

  try {
    const variants = await fetchSpringProductVariants(slug);
    if (variants.length > 0) {
      const normalizedVariants: Variant[] = variants.map((variant) => ({
        productId: variant.slug.split('-').pop() || variant.slug,
        label: variant.title,
        image: variant.image,
        price: variant.price,
        springUrl: variant.springUrl,
        slug: variant.slug,
      }));

      const first = normalizedVariants[0];
      return {
        props: {
          product: {
            slug,
            title: variants[0].title,
            image: variants[0].image,
            price: first?.price ?? null,
          },
          variants: normalizedVariants,
        },
      };
    }
  } catch {}

  const fallback = fallbackProducts.find((p) => p.slug === slug);
  if (fallback) {
    return { 
      props: { 
        product: { 
          slug: fallback.slug, 
          title: fallback.title, 
          image: fallback.image, 
          price: fallback.price ?? null 
        },
        variants: []
      } 
    };
  }
  
  return { props: { product: null, variants: [] } };
};
