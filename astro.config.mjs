import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import sidebar from './src/data/sidebar.mjs';

const isGitHubPages = process.env.DEPLOY_TARGET === 'github-pages';
const [githubOwner = 'owner', githubRepo = 'si-help-center'] = (
  process.env.GITHUB_REPOSITORY ?? 'owner/si-help-center'
).split('/');
const githubPagesBase =
  process.env.GITHUB_PAGES_BASE ??
  (githubRepo.endsWith('.github.io') ? undefined : `/${githubRepo}`);

export default defineConfig({
  site: isGitHubPages
    ? (process.env.GITHUB_PAGES_SITE ?? `https://${githubOwner}.github.io`)
    : 'https://spread-insight-help-center.yummy-owlet-9481.chatgpt.site',
  ...(isGitHubPages && githubPagesBase ? { base: githubPagesBase } : {}),
  redirects: Object.fromEntries(
    Object.entries({
      '/start/overview/': '/getting-started/interface-overview/',
      '/start/screener/': '/tools/stat-screener/screener/',
      '/start/backtester/': '/tools/stat-screener/backtester/',
      '/start/notifications/': '/tools/stat-screener/notifications/',
      '/start/spread-collections/': '/tools/spread-collections/overview/',
      '/start/spread-builder/': '/tools/spread-builder/overview/',
      '/start/ai-assistant/': '/tools/spread-builder/ai-assistant/',
      '/crypto/crypto-review/': '/tools/crypto-screener/overview/',
      '/crypto/crypto-pair-types/': '/strategies/crypto-arbitrage/types/',
      '/crypto/crypto-strategy-diff/': '/strategies/crypto-arbitrage/price-difference/',
      '/crypto/crypto-strategy-fiunding/': '/strategies/crypto-arbitrage/funding/',
      '/crypto/crypto-funding/': '/concepts/funding/',
      '/crypto/crypto-arbitrage-profit-calculation/': '/concepts/crypto-profit/',
      '/ideas/para-one-industry/': '/strategies/stat-arbitrage/industry-pair/',
      '/ideas/priviledges/': '/strategies/stat-arbitrage/ordinary-preferred/',
      '/ideas/trading-idea-common-owner/': '/strategies/stat-arbitrage/common-owner/',
      '/ideas/trading-idea-cointegration/': '/strategies/stat-arbitrage/cointegration-only/',
      '/stat-arbitrage/arbitrage-how-to/': '/strategies/stat-arbitrage/price-divergence/',
      '/stat-arbitrage/find/': '/technique/stat-arbitrage/find-pairs/',
      '/stat-arbitrage/profit-taking-methods/': '/technique/stat-arbitrage/profit-taking/',
      '/stat-arbitrage/cointegration/': '/concepts/cointegration/',
      '/stat-arbitrage/bollinger-bands/': '/concepts/bollinger-bands/',
      '/stat-arbitrage/optimal-position/': '/concepts/optimal-position/',
      '/stat-arbitrage/std/': '/concepts/standard-deviation/',
      '/platform/spread-chart/': '/technique/spread-chart/',
    }).map(([source, target]) => [
      source,
      isGitHubPages && githubPagesBase ? `${githubPagesBase}${target}` : target,
    ])
  ),
  integrations: [
    starlight({
      title: 'Spread Insight',
      description:
        'Центр знаний Spread Insight: скринеры, спреды, бэктесты, криптоарбитраж и статистический арбитраж.',
      logo: {
        src: './src/assets/logo.png',
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
      components: {
        Head: './src/components/Head.astro',
      },
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
