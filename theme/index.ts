import { extendTheme, ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

// SVG fractal noise, percent-encoded to safely embed in CSS url()
const noiseSvgEncoded =
  '%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 100 100%22%3E%3Cfilter id%3D%22noise%22%3E%3CfeTurbulence type%3D%22fractalNoise%22 baseFrequency%3D%220.65%22 numOctaves%3D%223%22 stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect width%3D%22100%25%22 height%3D%22100%25%22 filter%3D%22url(%23noise)%22%2F%3E%3C%2Fsvg%3E';

const theme = extendTheme({
  config,
  fonts: {
    heading: 'Space Grotesk, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    body: 'Space Grotesk, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  colors: {
    primary: '#bd580f',
    background: {
      light: '#f8f7f6',
      dark: '#221810',
    },
  },
  radii: {
    base: '0.125rem',
    md: '0.25rem',
    lg: '0.5rem',
    full: '0.75rem',
  },
  styles: {
    global: (props: any) => ({
      'html, body': {
        bg: mode('background.light', 'background.dark')(props),
        color: mode('gray.900', 'gray.300')(props),
      },
      '.distressed-texture': {
        position: 'relative',
        '&::before': {
          content: "''",
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,${noiseSvgEncoded}")`,
          opacity: 0.05,
          pointerEvents: 'none',
        },
      },
    }),
  },
});

export default theme;
