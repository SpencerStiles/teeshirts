import {
  Box,
  Button,
  Container,
  Heading,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";

export default function WelcomePage() {
  const heroBg = `url("/logos/logo-63.png")`;

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      {/* Logo bar — above the hero image */}
      <Box textAlign="center" py={4} bg="black">
        <Image
          src="/logos/logo-63.png"
          alt="SGM Says Logo"
          h="120px"
          mx="auto"
        />
      </Box>

      {/* Hero */}
      <Box
        className="distressed-texture"
        flex="1"
        bg="black"
        bgImage={heroBg}
        bgSize="contain"
        bgPos="center"
        bgRepeat="no-repeat"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="white"
        px={4}
        py={12}
      >
      <Container maxW="3xl">
        <VStack spacing={8} textAlign="center">
          <Heading
            as="h1"
            textTransform="uppercase"
            letterSpacing="widest"
            fontWeight="extrabold"
            size={{ base: "2xl", md: "3xl", lg: "4xl" }}
          >
            SERGEANT MAJOR SAYS
          </Heading>

          <VStack
            spacing={4}
            align="stretch"
            fontSize={{ base: "md", md: "lg" }}
          >
            <Text>
              Thank you for visiting my site, my intention is to show you so
              many exciting things that you will come back repeatedly. This site
              is veteran owned and ran. All designs come from one scary
              infantry/combat engineer mind! My purpose is to just put a smile
              on your face or a holy moly Batman, I remember that!
            </Text>
            <Text>
              Both men and women can wear all American Apparel alike, even for
              kids (parents&#39; discretion of course). In today&#39;s military
              there are only warriors. Regardless of race, sex, or gender, my
              collection is based on that. That said this site is for everyone,
              active duty, vets, and civilians. Enjoy!
            </Text>
            <Text>
              Some apparel depicts references to weapons and or combat themes
              and attitudes. Just to be clear, we are a country coming out of 20
              years of constant war. Our troops need to rest and heal. So does
              our country. We all need something to bring us back together. If
              that is a T-shirt that makes all those that serve bust a gut but
              offends everyone else&#39;s sensibilities, then so be. We owe them
              that after the last two decades they have had.
            </Text>
            <Text>
              So, I hope everyone can laugh with us. Some themes are a little
              dark but then so are your little boys and girls =-). You might not
              get it, but trust me, they will!
            </Text>
            <Text>
              I challenge you not to locate at least two or three gems for
              yourself or the perfect gift for your difficult-to-shop-for
              friends. FYI, most shirts have something special on the back just
              for you!
            </Text>
            <Text>
              In the coming months, my plan is to increase and add more items
              and styles. Please be sure to comment on our direction. Please
              feel free to comment on what you like and what you do not like, or
              what we can do better.
            </Text>
            <Text>
              So put on your big boy pants and come on inside to the real world!
            </Text>
            <Text>
              Try not to be too hard on the things that you do not like.
              Remember, I am just an old crusty grunt!
            </Text>
            <Text fontWeight="semibold" mt={2}>
              Thank you!
              <br />
              Retired Sergeant Major
              <br />
              R.H.C
            </Text>
          </VStack>

          <Button
            as={Link}
            href="/shop"
            rounded="full"
            bg="primary"
            color="white"
            px={10}
            py={4}
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            size="lg"
            _hover={{ transform: "scale(1.03)", bg: "primary" }}
            transition="transform 0.15s ease"
          >
            Enter
          </Button>
        </VStack>
      </Container>
      </Box>
    </Box>
  );
}
