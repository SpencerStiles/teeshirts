import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import Link from "next/link";

export default function WelcomePage() {
  const heroBg = useColorModeValue(
    `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJStksEtGhq98yefXs1KCCKD5YIPs74URQXVu9gpiTpC2TA8JPUD61LXn6x76ZrnduNmFwPBGti_76wTZSslBiATJPbh8FbtLZ7awQkA6vo34qpgKVxtyUAlfBSiw6RpstwMJj1MaXxWoczOuBHdTNKWSX-_00ttFzfvxUdQ3WPTXcBW8-gc_4DaH_p_CEEU7muJ0Bj7b17jnAg9zQmipOvUoLq1OLt7C5Np683rmtafvDm_dKXG2tztwREW9sg5ArFH1lUxdqoZ0")`,
    `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDJStksEtGhq98yefXs1KCCKD5YIPs74URQXVu9gpiTpC2TA8JPUD61LXn6x76ZrnduNmFwPBGti_76wTZSslBiATJPbh8FbtLZ7awQkA6vo34qpgKVxtyUAlfBSiw6RpstwMJj1MaXxWoczOuBHdTNKWSX-_00ttFzfvxUdQ3WPTXcBW8-gc_4DaH_p_CEEU7muJ0Bj7b17jnAg9zQmipOvUoLq1OLt7C5Np683rmtafvDm_dKXG2tztwREW9sg5ArFH1lUxdqoZ0")`
  );

  return (
    <Box
      className="distressed-texture"
      minH="100vh"
      bgImage={heroBg}
      bgSize="cover"
      bgPos="center"
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
              Both men and women can wear all apparel alike, even for kids
              (parents&#39; discretion of course). In today&#39;s military there
              are only warriors. Regardless of race, sex, or gender, my
              collection is based on that. That said this site is for everyone,
              active duty, vets, and civilians. Enjoy!
            </Text>
            <Text>
              I challenge you to not locate at least two or three gems for
              yourself or the perfect gift for your difficult-to-shop-for
              friends. FYI, most shirts have something special on the back just
              for you!
            </Text>
            <Text>
              Some apparel depicts references to weapons; it does not imply that
              I am a proponent of this or anti-that. What it means is that I was
              a combat soldier!
            </Text>
            <Text>
              In the coming months, my plan is to increase and add more items
              and styles. Please be sure to comment on our direction. Please
              feel free to comment on what you like and what you do not like, or
              what we can do better.
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
  );
}
