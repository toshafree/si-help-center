import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { youtubeUrlForRutubeId } from '../src/data/video-providers.mjs';

const SOURCE_ORIGIN = 'https://spread-i.online';
const TOPICS_URL = `${SOURCE_ORIGIN}/api/get-topics`;
const ARTICLE_URL = `${SOURCE_ORIGIN}/api/get-article-by-slug`;
const DOCS_DIR = path.resolve('src/content/docs');
const ASSETS_DIR = path.resolve('public/help-assets');
const SIDEBAR_FILE = path.resolve('src/data/sidebar.mjs');
const TOPICS_CACHE = path.resolve('.cache/spread-topics.json');

const htmlEntities = {
  amp: '&',
  '#38': '&',
  '#61': '=',
  quot: '"',
  '#34': '"',
  apos: "'",
  '#39': "'",
  lt: '<',
  '#60': '<',
  gt: '>',
  '#62': '>',
};

const topicDirs = new Map([
  ['Как пользоваться Spread Insight для поиска арбитражных возможностей', 'start'],
  ['Криптоскринер для арбитража на фьючерсах', 'crypto'],
  ['Торговые идеи для статистического арбитража', 'ideas'],
  ['Как работает статистический арбитраж', 'stat-arbitrage'],
  ['Как работает платформа Spread Insight', 'platform'],
]);

function decodeHtmlEntities(value) {
  return value.replace(/&([^;]+);/g, (match, entity) => htmlEntities[entity] ?? match);
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ''));
}

function frontmatter(article, topicName, originalUrl) {
  const description = article.description ?? {};
  const lines = [
    '---',
    `title: ${yamlString(article.title)}`,
    `description: ${yamlString([topicName, description.reading_time, description.video].filter(Boolean).join(' · '))}`,
    `source: ${yamlString(originalUrl)}`,
    `readingTime: ${yamlString(description.reading_time ?? '')}`,
  ];

  if (description.video) lines.push(`video: ${yamlString(description.video)}`);

  lines.push('---', '');
  return `${lines.join('\n')}\n`;
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).toLowerCase();
  return ext || '.png';
}

function basenameFromUrl(url) {
  const pathname = new URL(url).pathname;
  return path.basename(pathname).replace(/[^a-zA-Z0-9._-]/g, '-');
}

async function downloadImage(url, slug, index, imageMap) {
  const decodedUrl = decodeHtmlEntities(url);
  if (imageMap.has(decodedUrl)) return imageMap.get(decodedUrl);

  const ext = extensionFromUrl(decodedUrl);
  const base = basenameFromUrl(decodedUrl).replace(new RegExp(`${ext}$`, 'i'), '');
  const fileName = `${slug}-${index + 1}-${base}${ext}`;
  const filePath = path.join(ASSETS_DIR, fileName);

  const response = await fetch(decodedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image ${decodedUrl}: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, bytes);

  const publicPath = `/help-assets/${fileName}`;

  imageMap.set(decodedUrl, publicPath);
  return publicPath;
}

async function rewriteImages(markdown, slug) {
  const imageMap = new Map();
  const imagePattern = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const replacements = [];
  let index = 0;
  let match;

  while ((match = imagePattern.exec(markdown))) {
    const [full, alt, url] = match;
    const localPath = await downloadImage(url, slug, index, imageMap);
    const nextAlt = alt || `Иллюстрация к статье ${slug}`;
    replacements.push([full, `![${nextAlt}](${localPath})`]);
    index += 1;
  }

  let result = markdown;
  for (const [from, to] of replacements) {
    result = result.replace(from, to);
  }

  return result;
}

function routeForHelpUrl(url, routeMap) {
  const match = url.match(/^\/help\/([a-zA-Z0-9-]+)$/);
  if (!match) return url;
  return routeMap.get(match[1]) ?? `/${match[1]}/`;
}

function rewriteHelpLinks(markdown, routeMap) {
  return markdown
    .replace(/\]\(\/help\/([a-zA-Z0-9-]+)\)/g, (_, slug) => `](${routeMap.get(slug) ?? `/${slug}/`})`)
    .replace(/href="\/help\/([a-zA-Z0-9-]+)"/g, (_, slug) => `href="${routeMap.get(slug) ?? `/${slug}/`}"`);
}

function isDocsRootUrl(url) {
  return [
    '/crypto/',
    '/help-assets/',
    '/ideas/',
    '/platform/',
    '/start/',
    '/stat-arbitrage/',
  ].some((prefix) => url.startsWith(prefix));
}

function rewriteSourceSiteLinks(markdown) {
  return markdown
    .replace(/\]\(\/(?!\/)([^)\s]+)\)/g, (match, target) => {
      const url = `/${target}`;
      return isDocsRootUrl(url) ? match : `](${SOURCE_ORIGIN}${url})`;
    })
    .replace(/href="\/(?!\/)([^"]+)"/g, (match, target) => {
      const url = `/${target}`;
      return isDocsRootUrl(url) ? match : `href="${SOURCE_ORIGIN}${url}"`;
    });
}

function appendNextLinks(markdown, nextLinks = [], routeMap) {
  if (!Array.isArray(nextLinks) || nextLinks.length === 0) return markdown;

  const links = nextLinks
    .map((item) => `- [${item.title}](${routeForHelpUrl(item.url, routeMap)})`)
    .join('\n');

  return `${markdown.trim()}\n\n## Читать далее\n\n${links}\n`;
}

function normalizeMarkdown(markdown) {
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/−/g, '-')
    .trim();
}

function removeLeadingTitle(markdown) {
  return markdown.replace(/^\s*#\s+.+?(?:\n{1,}|$)/, '').trim();
}

function promoteImportedHeadings(markdown) {
  return markdown.replace(/^(#{3,6})\s+/gm, (match, hashes) => `${'#'.repeat(hashes.length - 1)} `);
}

function removeEmptyImages(markdown) {
  return markdown.replace(/^\s*!\[[^\]]*\]\(\s*\)\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function videoPlayerMarkup({ title, rutubeUrl, youtubeUrl }) {
  const attributes = [
    `title="${escapeHtmlAttribute(title)}"`,
    youtubeUrl ? `youtube="${escapeHtmlAttribute(youtubeUrl)}"` : undefined,
    `rutube="${escapeHtmlAttribute(rutubeUrl)}"`,
  ].filter(Boolean);
  const links = [
    youtubeUrl
      ? `<a href="${escapeHtmlAttribute(youtubeUrl)}">YouTube</a>`
      : undefined,
    `<a href="${escapeHtmlAttribute(rutubeUrl)}">Rutube</a>`,
  ].filter(Boolean);

  return [
    '<div class="si-video-block">',
    `<si-video ${attributes.join(' ')}><span class="si-video__fallback">Смотреть видео: ${links.join(' · ')}</span></si-video>`,
    '</div>',
  ].join('\n');
}

function rewriteVideos(markdown, title) {
  return markdown.replace(/<iframe\b([^>]*)>\s*<\/iframe>/gi, (iframe, attributes) => {
    const sourceMatch = attributes.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (!sourceMatch) return iframe;

    try {
      const rutubeUrl = new URL(decodeHtmlEntities(sourceMatch[2]));
      if (rutubeUrl.hostname !== 'rutube.ru' && rutubeUrl.hostname !== 'www.rutube.ru') {
        return iframe;
      }

      const rutubeId = rutubeUrl.pathname.match(
        /^\/(?:video|play\/embed)\/([a-f0-9]{32})(?:\/|$)/i
      )?.[1];
      if (!rutubeId) return iframe;

      return videoPlayerMarkup({
        title,
        rutubeUrl: rutubeUrl.toString(),
        youtubeUrl: youtubeUrlForRutubeId(rutubeId),
      });
    } catch {
      return iframe;
    }
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function buildSidebar(topics) {
  const topicLabels = new Map([
    ['Как пользоваться Spread Insight для поиска арбитражных возможностей', 'Быстрый старт'],
    ['Криптоскринер для арбитража на фьючерсах', 'Криптоскринер'],
    ['Торговые идеи для статистического арбитража', 'Торговые идеи'],
    ['Как работает статистический арбитраж', 'Статистический арбитраж'],
    ['Как работает платформа Spread Insight', 'Платформа'],
  ]);

  const groups = topics.map((topic) => {
    const directory = topicDirs.get(topic.name) ?? topic.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
    return {
      label: topicLabels.get(topic.name) ?? topic.name,
      items: topic.articles.map((article) => ({
        label: article.title,
        slug: `${directory}/${article.slug}`,
      })),
    };
  });

  return [
    { label: 'Главная', link: '/' },
    ...groups,
  ];
}

function buildRouteMap(topics) {
  const routes = new Map();
  for (const topic of topics) {
    const directory = topicDirs.get(topic.name) ?? topic.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
    for (const article of topic.articles) {
      routes.set(article.slug, `/${directory}/${article.slug}/`);
    }
  }
  return routes;
}

function sidebarModule(sidebar) {
  return `const sidebar = ${JSON.stringify(sidebar, null, 2)};\n\nexport default sidebar;\n`;
}

async function ensureDirs() {
  await mkdir(DOCS_DIR, { recursive: true });
  await mkdir(ASSETS_DIR, { recursive: true });
  await mkdir(path.dirname(TOPICS_CACHE), { recursive: true });
  for (const dir of topicDirs.values()) {
    await mkdir(path.join(DOCS_DIR, dir), { recursive: true });
  }
}

async function loadTopics() {
  try {
    const cached = await readFile(TOPICS_CACHE, 'utf8');
    return JSON.parse(cached);
  } catch {
    const topics = await fetchJson(TOPICS_URL);
    await writeFile(TOPICS_CACHE, `${JSON.stringify(topics, null, 2)}\n`);
    return topics;
  }
}

async function importArticle(article, topicName, directory, routeMap) {
  const originalUrl = `${SOURCE_ORIGIN}/help/${article.slug}`;
  const data = await fetchJson(`${ARTICLE_URL}?slug=${encodeURIComponent(article.slug)}`);
  let markdown = normalizeMarkdown(data.content ?? '');
  markdown = removeLeadingTitle(markdown);
  markdown = promoteImportedHeadings(markdown);
  markdown = removeEmptyImages(markdown);
  markdown = rewriteVideos(markdown, data.title);
  markdown = await rewriteImages(markdown, data.slug);
  markdown = rewriteHelpLinks(markdown, routeMap);
  markdown = rewriteSourceSiteLinks(markdown);
  markdown = appendNextLinks(markdown, data.description?.next, routeMap);

  const output = `${frontmatter(data, topicName, originalUrl)}${markdown}\n`;
  await writeFile(path.join(DOCS_DIR, directory, `${data.slug}.md`), output);

  return data.slug;
}

async function main() {
  await ensureDirs();
  const topics = await loadTopics();
  const routeMap = buildRouteMap(topics);

  let importedCount = 0;
  for (const topic of topics) {
    const directory = topicDirs.get(topic.name) ?? topic.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
    await mkdir(path.join(DOCS_DIR, directory), { recursive: true });

    for (const article of topic.articles) {
      await importArticle(article, topic.name, directory, routeMap);
      importedCount += 1;
    }
  }

  await writeFile(SIDEBAR_FILE, sidebarModule(buildSidebar(topics)));
  console.log(`Imported ${importedCount} articles from ${topics.length} topics.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
