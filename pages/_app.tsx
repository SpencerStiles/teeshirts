import type { AppProps } from 'next/app';
import { ChakraProvider, ColorModeScript, Container } from '@chakra-ui/react';
import theme from '@/theme/index';
import { DefaultSeo } from 'next-seo';
import Head from 'next/head';
import NavBar from '@/components/NavBar';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <DefaultSeo
        titleTemplate="%s | SGT Major Says"
        defaultTitle="SGT Major Says Shop"
        description="Official SGT Major Says merch store"
        openGraph={{
          type: 'website',
          locale: 'en_US',
          url: 'https://your-domain.com',
          siteName: 'SGT Major Says',
        }}
        twitter={{ cardType: 'summary_large_image' }}
      />
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <NavBar />
      <Container maxW="7xl" py={8}>
        <Component {...pageProps} />
      </Container>
    </ChakraProvider>
  );
}
