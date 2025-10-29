import {
  Box,
  Flex,
  Heading,
  IconButton,
  useColorMode,
  Link as CLink,
  useColorModeValue,
} from "@chakra-ui/react";
import Link from "next/link";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

export default function NavBar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue("rgba(248,247,246,0.80)", "rgba(34,24,16,0.80)");
  const border = "1px solid rgba(189,88,15,0.20)"; // primary/20

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      borderBottom={border}
      bg={bg}
      backdropFilter="auto"
      backdropBlur="sm"
    >
      <Flex
        maxW="7xl"
        mx="auto"
        px={{ base: 4, sm: 6, lg: 8 }}
        py={3}
        align="center"
        justify="space-between"
      >
        <Flex align="center" gap={4}>
          {/* Simple logo glyph using currentColor (primary) */}
          <Box color="primary" w={8} h={8}>
            <svg
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
            >
              <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" />
            </svg>
          </Box>
          <Heading size="md" textTransform="uppercase" letterSpacing="widest">
            <CLink
              as={Link}
              href="/shop"
              _hover={{ textDecoration: "none", color: "primary" }}
            >
              Sergeant Major Says
            </CLink>
          </Heading>
        </Flex>
        <Box>
          <IconButton
            aria-label="Toggle color mode"
            onClick={toggleColorMode}
            variant="ghost"
            rounded="full"
            _hover={{ bg: "rgba(189,88,15,0.20)", color: "primary" }}
            icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
          />
        </Box>
      </Flex>
    </Box>
  );
}
