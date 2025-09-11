import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Theme color for light and dark */}
          <meta name="theme-color" content="#F7FAFC" media="(prefers-color-scheme: light)" />
          <meta name="theme-color" content="#1A202C" media="(prefers-color-scheme: dark)" />

          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="manifest" href="/site.webmanifest" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
