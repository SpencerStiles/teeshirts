import { Box, Flex, Heading, IconButton, useColorMode, Link as CLink } from '@chakra-ui/react';
import Link from 'next/link';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

export default function NavBar() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <Box as="header" borderBottomWidth="1px">
      <Flex maxW="7xl" mx="auto" px={6} py={4} align="center">
        <Heading size="md">
          <CLink as={Link} href="/shop" _hover={{ textDecoration: 'none' }}>
            SGT Major Says
          </CLink>
        </Heading>
        <Box ml="auto">
          <IconButton
            aria-label="Toggle color mode"
            onClick={toggleColorMode}
            variant="ghost"
            icon={colorMode === 'dark' ? <SunIcon /> : <MoonIcon />}
          />
        </Box>
      </Flex>
    </Box>
  );
}
