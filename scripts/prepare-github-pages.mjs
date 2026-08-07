import { createHash } from 'node:crypto';
import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.xml']);
const RUNTIME_MANAGED_PREFIXES = new Set(['pagefind']);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function githubPagesBase() {
  const repository = process.env.GITHUB_REPOSITORY ?? 'owner/si-help-center';
  const repo = repository.split('/')[1] ?? 'si-help-center';
  const configuredBase = process.env.GITHUB_PAGES_BASE;
  const base = configuredBase ?? (repo.endsWith('.github.io') ? '' : `/${repo}`);

  if (!base || base === '/') return '';
  return base.startsWith('/') ? base.replace(/\/$/, '') : `/${base.replace(/\/$/, '')}`;
}

function rootUrlPattern(base, prefixes) {
  const baseSegment = base.replace(/^\//, '');
  const prefixPattern = prefixes.map(escapeRegExp).join('|');
  const excluded = baseSegment
    ? `(?!${baseSegment}(?:/|$))`
    : '';

  return new RegExp(`(["'=:(,\\s])/${excluded}(?=(${prefixPattern})(?:[/?#"']|$))`, 'g');
}

function dedupeBaseUrls(value, base) {
  if (!base) return value;
  const segment = escapeRegExp(base.replace(/^\//, ''));
  return value.replace(new RegExp(`/${segment}/${segment}(?=/)`, 'g'), `/${base.replace(/^\//, '')}`);
}

function prefixRootUrls(value, base, prefixes) {
  if (!base) return value;
  return dedupeBaseUrls(value.replace(rootUrlPattern(base, prefixes), `$1${base}/`), base);
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

async function versionSearchBundles(files) {
  const bundles = files.filter((file) => /^Search\.astro_.*\.js$/.test(path.basename(file)));
  const replacements = [];

  for (const file of bundles) {
    const content = await readFile(file, 'utf8');
    const digest = createHash('sha256').update(content).digest('hex').slice(0, 12);
    const originalName = path.basename(file);
    const versionedName = originalName.replace(/\.js$/, `.${digest}.js`);
    replacements.push({ file, originalName, versionedName });
  }

  for (const file of files) {
    const original = await readFile(file, 'utf8');
    let next = original;
    for (const { originalName, versionedName } of replacements) {
      next = next.replaceAll(originalName, versionedName);
    }
    if (next !== original) await writeFile(file, next);
  }

  for (const { file, versionedName } of replacements) {
    await rename(file, path.join(path.dirname(file), versionedName));
  }
}

async function main() {
  const base = githubPagesBase();
  const rootEntries = await readdir(DIST_DIR, { withFileTypes: true });
  const rootUrlPrefixes = rootEntries
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.') && !RUNTIME_MANAGED_PREFIXES.has(name));
  const files = await walk(DIST_DIR);

  for (const file of files) {
    const original = await readFile(file, 'utf8');
    const next = prefixRootUrls(original, base, rootUrlPrefixes);
    if (next !== original) await writeFile(file, next);
  }

  await versionSearchBundles(files);

  await writeFile(path.join(DIST_DIR, '.nojekyll'), '');
  console.log(`Prepared GitHub Pages build${base ? ` for base ${base}` : ''}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
