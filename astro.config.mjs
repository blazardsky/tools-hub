// @ts-check

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import partytown from '@astrojs/partytown';

import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',

  i18n: {
    locales: ['en', 'it'],
    defaultLocale: 'en',
    fallback: {
      it: 'en',
    },
    routing: {
      prefixDefaultLocale: false
    },
  },

  integrations: [
    react(), sitemap(), partytown({
      config: {
        forward: ['umami.track'],
      },
    })
  ],

  output: 'server',

  fonts: [
      {
          provider: fontProviders.local(),
          name: 'General Sans',
          cssVariable: '--font',
          fallbacks: ['sans-serif'],
          options: {
              variants: [
                  {
                      src: [
                        './src/assets/fonts/GeneralSans-Variable.ttf',
                        './src/assets/fonts/GeneralSans-Variable.woff',
                        './src/assets/fonts/GeneralSans-Variable.woff2',
                      ],
                      weight: "100 900",
                      style: 'normal',
                      display: 'swap',
                  },
                  {
                    src: [
                      './src/assets/fonts/GeneralSans-VariableItalic.ttf',
                      './src/assets/fonts/GeneralSans-VariableItalic.woff',
                      './src/assets/fonts/GeneralSans-VariableItalic.woff2',
                    ],
                    weight: "100 900",
                    style: 'italic',
                    display: 'swap',
                },
            ],
          },
      },
    ],

  adapter: cloudflare({
    imageService: 'compile',
  }),

  vite: {
    plugins: [tailwindcss()],
  },
});