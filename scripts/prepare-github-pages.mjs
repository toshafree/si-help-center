import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.xml']);
const ROOT_URL_PREFIXES = [
  '_astro',
  '404.html',
  'crypto',
  'favicon.svg',
  'help-assets',
  'ideas',
  'index.html',
  'pagefind',
  'platform',
  'sitemap',
  'start',
  'stat-arbitrage',
];

function githubPagesBase() {
  const repository = process.env.GITHUB_REPOSITORY ?? 'owner/si-help-center';
  const repo = repository.split('/')[1] ?? 'si-help-center';
  const configuredBase = process.env.GITHUB_PAGES_BASE;
  const base = configuredBase ?? (repo.endsWith('.github.io') ? '' : `/${repo}`);

  if (!base || base === '/') return '';
  return base.startsWith('/') ? base.replace(/\/$/, '') : `/${base.replace(/\/$/, '')}`;
}

function rootUrlPattern(base) {
  const baseSegment = base.replace(/^\//, '');
  const prefixes = ROOT_URL_PREFIXES.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const excluded = baseSegment
    ? `(?!${baseSegment}(?:/|$))`
    : '';

  return new RegExp(`(["'=:(,\\s])/${excluded}(?=(${prefixes})(?:[/?#"']|$))`, 'g');
}

function prefixRootUrls(value, base) {
  if (!base) return value;
  return value.replace(rootUrlPattern(base), `$1${base}/`);
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(filePath)));
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(filePath);
    }
  }
  return files;
}

async function main() {
  const base = githubPagesBase();
  const files = await walk(DIST_DIR);

  for (const file of files) {
    const original = await readFile(file, 'utf8');
    const next = prefixRootUrls(original, base);
    if (next !== original) await writeFile(file, next);
  }

  await writeFile(path.join(DIST_DIR, '.nojekyll'), '');
  console.log(`Prepared GitHub Pages build${base ? ` for base ${base}` : ''}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
