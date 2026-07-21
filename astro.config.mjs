import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import sidebar from './src/data/sidebar.mjs';

export default defineConfig({
  site: 'https://spread-insight-help-center.example',
  integrations: [
    starlight({
      title: 'Spread Insight',
      description:
        'Центр знаний Spread Insight: скринеры, спреды, бэктесты, криптоарбитраж и статистический арбитраж.',
      logo: {
        src: './src/assets/logo.svg',
        alt: 'Spread Insight',
      },
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'Русский',
          lang: 'ru',
        },
      },
      social: [
        {
          icon: 'telegram',
          label: 'Telegram',
          href: 'https://t.me/spread_insight_online',
        },
        {
          icon: 'youtube',
          label: 'YouTube',
          href: 'https://www.youtube.com/@spreadinsight',
        },
        {
          icon: 'seti:video',
          label: 'Rutube',
          href: 'https://rutube.ru/channel/58023809/',
        },
      ],
      customCss: ['./src/styles/custom.css'],
      sidebar,
      pagefind: {
        ranking: {
          pageLength: 0.25,
          termFrequency: 1,
          termSimilarity: 1,
        },
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
      credits: false,
    }),
  ],
});
