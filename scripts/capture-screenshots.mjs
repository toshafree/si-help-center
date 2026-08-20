#!/usr/bin/env node

import { access, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const DOCS_DIR = path.join(ROOT_DIR, 'src/content/docs');
const ASSETS_DIR = path.join(ROOT_DIR, 'public/help-assets/screenshots');
const DEFAULT_START_URL = 'https://spread-i.online/';
const DEFAULT_OUTPUT_WIDTH = 1600;
const DEFAULT_QUALITY = 90;
const MARKER_PATTERN = /^\s*\[(скриншот|картинка)(?:\s*:\s*([^\]\r\n]+))?\]\s*$/gim;
const GENERATED_FIGURE_PATTERN = /<figure\b(?=[^>]*class="[^"]*\bsi-themed-screenshot\b[^"]*")[\s\S]*?<\/figure>/gim;
let runtimeContext;
let runtimeStagingDirectory;

function printHelp() {
  console.log(`
Создание тематических скриншотов для статьи

Использование:
  npm run screenshots -- <путь-к-статье> [параметры]

Пример:
  npm run screenshots -- src/content/docs/tools/stat-screener/overview.md

Параметры:
  --url <адрес>       Стартовая страница приложения
  --width <пиксели>   Максимальная ширина результата, по умолчанию ${DEFAULT_OUTPUT_WIDTH}
  --quality <1-100>   Качество WebP, по умолчанию ${DEFAULT_QUALITY}
  --list              Показать найденные маркеры без запуска браузера
  --annotate          Изменить аннотации уже созданных изображений
  --help              Показать эту справку

Маркеры в статье:
  [скриншот]
  [скриншот: main-screen]
  [картинка: spread-reversal]
`);
}

function parseArguments(argv) {
  const options = {
    article: undefined,
    quality: DEFAULT_QUALITY,
    startUrl: process.env.SCREENSHOT_START_URL,
    width: DEFAULT_OUTPUT_WIDTH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--list') {
      options.list = true;
    } else if (argument === '--annotate') {
      options.annotate = true;
    } else if (argument === '--url') {
      options.startUrl = argv[++index];
    } else if (argument === '--width') {
      options.width = Number(argv[++index]);
    } else if (argument === '--quality') {
      options.quality = Number(argv[++index]);
    } else if (!argument.startsWith('-') && !options.article) {
      options.article = argument;
    } else {
      throw new Error(`Неизвестный параметр: ${argument}`);
    }
  }

  if (!Number.isInteger(options.width) || options.width < 320 || options.width > 4000) {
    throw new Error('--width должен быть целым числом от 320 до 4000.');
  }
  if (!Number.isInteger(options.quality) || options.quality < 1 || options.quality > 100) {
    throw new Error('--quality должен быть целым числом от 1 до 100.');
  }

  return options;
}

function normalizeArticlePath(articleArgument) {
  const articlePath = path.resolve(ROOT_DIR, articleArgument);
  const relativePath = path.relative(DOCS_DIR, articlePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Статья должна находиться внутри src/content/docs.');
  }
  if (!/\.mdx?$/i.test(articlePath)) {
    throw new Error('Поддерживаются статьи с расширением .md или .mdx.');
  }

  return { articlePath, relativePath };
}

function slugify(value, fallback) {
  const slug = value
    .trim()
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function findMarkers(source) {
  const markers = [];
  for (const match of source.matchAll(MARKER_PATTERN)) {
    markers.push({
      end: match.index + match[0].length,
      explicitId: match[2]?.trim(),
      mediaKind: match[1].toLocaleLowerCase('ru') === 'картинка' ? 'illustration' : 'screenshot',
      raw: match[0],
      start: match.index,
    });
  }
  return markers;
}

function cleanContextBlock(block) {
  return block
    .replace(/^\s*\[(?:скриншот|картинка)(?:\s*:\s*[^\]\r\n]+)?\]\s*$/gim, '')
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)]\([^\)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractContext(source, marker) {
  const before = source.slice(0, marker.start);
  const after = source.slice(marker.end);
  const headingMatches = [...before.matchAll(/^#{1,4}\s+(.+)$/gm)];
  const heading = headingMatches.at(-1)?.[1]?.trim() ?? 'Скриншот';
  const previousBlocks = before
    .split(/\n\s*\n/)
    .map(cleanContextBlock)
    .filter(Boolean)
    .slice(-2);
  const nextBlocks = after
    .split(/\n\s*\n/)
    .map(cleanContextBlock)
    .filter(Boolean)
    .slice(0, 2);

  return {
    after: nextBlocks.join('\n\n').slice(0, 700),
    before: previousBlocks.join('\n\n').slice(-700),
    heading,
  };
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatCoordinate(value) {
  return Number(value.toFixed(1)).toString();
}

function normalizeAnnotations(annotations, captureWidth, captureHeight) {
  if (!Array.isArray(annotations)) return [];

  return annotations.flatMap((annotation) => {
    if (annotation?.type === 'rect') {
      const x = Number(annotation.x);
      const y = Number(annotation.y);
      const width = Number(annotation.width);
      const height = Number(annotation.height);
      if (![x, y, width, height].every(Number.isFinite) || width < 2 || height < 2) return [];
      return [{
        height: Math.min(height, captureHeight - Math.max(0, y)),
        type: 'rect',
        width: Math.min(width, captureWidth - Math.max(0, x)),
        x: Math.max(0, x),
        y: Math.max(0, y),
      }];
    }

    if (annotation?.type === 'arrow') {
      const x1 = Number(annotation.x1);
      const y1 = Number(annotation.y1);
      const x2 = Number(annotation.x2);
      const y2 = Number(annotation.y2);
      if (![x1, y1, x2, y2].every(Number.isFinite)) return [];
      return [{
        type: 'arrow',
        x1: Math.min(captureWidth, Math.max(0, x1)),
        x2: Math.min(captureWidth, Math.max(0, x2)),
        y1: Math.min(captureHeight, Math.max(0, y1)),
        y2: Math.min(captureHeight, Math.max(0, y2)),
      }];
    }

    return [];
  });
}

function renderAnnotations(result) {
  const annotations = normalizeAnnotations(result.annotations, result.captureWidth, result.captureHeight);
  if (annotations.length === 0) return '';

  const markerId = `si-arrow-${result.id}`;
  const shapes = annotations.map((annotation) => {
    if (annotation.type === 'rect') {
      const attributes = `x="${formatCoordinate(annotation.x)}" y="${formatCoordinate(annotation.y)}" width="${formatCoordinate(annotation.width)}" height="${formatCoordinate(annotation.height)}" rx="6"`;
      return `      <rect class="si-media-annotation__halo" ${attributes} />\n      <rect class="si-media-annotation__shape si-media-annotation__rect" ${attributes} />`;
    }

    const attributes = `x1="${formatCoordinate(annotation.x1)}" y1="${formatCoordinate(annotation.y1)}" x2="${formatCoordinate(annotation.x2)}" y2="${formatCoordinate(annotation.y2)}"`;
    return `      <line class="si-media-annotation__halo" ${attributes} />\n      <line class="si-media-annotation__shape si-media-annotation__arrow" ${attributes} marker-end="url(#${markerId})" />`;
  }).join('\n');

  return `
    <svg
      class="si-media-annotation"
      viewBox="0 0 ${formatCoordinate(result.captureWidth)} ${formatCoordinate(result.captureHeight)}"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="${markerId}" markerWidth="16" markerHeight="16" refX="13" refY="7" orient="auto" markerUnits="userSpaceOnUse">
          <path class="si-media-annotation__arrowhead" d="M 0 0 L 14 7 L 0 14 L 3.5 7 z" />
        </marker>
      </defs>
${shapes}
    </svg>`;
}

function renderScreenshotMarkup(result) {
  const caption = result.caption
    ? `\n  <figcaption>${escapeHtml(result.caption)}</figcaption>`
    : '';
  const kind = result.mediaKind === 'illustration' ? 'illustration' : 'screenshot';
  const refresh = kind === 'illustration' ? 'manual' : 'auto';
  const annotations = renderAnnotations(result);

  return `<figure
  class="si-themed-screenshot"
  data-capture-height="${formatCoordinate(result.captureHeight)}"
  data-capture-width="${formatCoordinate(result.captureWidth)}"
  data-media-id="${escapeHtml(result.id)}"
  data-media-kind="${kind}"
  data-refresh="${refresh}"
  style="--si-screenshot-width: ${result.displayWidth}px"
>
  <div class="si-themed-screenshot__media">
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--dark"
      src="${result.darkUrl}"
      alt="${escapeHtml(result.alt)}"
      width="${result.width}"
      height="${result.height}"
      loading="lazy"
      decoding="async"
    />
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--light"
      src="${result.lightUrl}"
      alt="${escapeHtml(result.alt)}"
      width="${result.width}"
      height="${result.height}"
      loading="lazy"
      decoding="async"
    />${annotations}
  </div>${caption}
</figure>`;
}

function decodeHtml(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}

function readHtmlAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'));
  return match ? decodeHtml(match[1]) : undefined;
}

function readNumericAttribute(tag, name) {
  const value = Number(readHtmlAttribute(tag, name));
  return Number.isFinite(value) ? value : undefined;
}

function parseGeneratedAnnotations(figure) {
  const annotations = [];
  for (const match of figure.matchAll(/<rect\b[^>]*class="[^"]*\bsi-media-annotation__rect\b[^"]*"[^>]*\/?\s*>/gim)) {
    const tag = match[0];
    const annotation = {
      height: readNumericAttribute(tag, 'height'),
      type: 'rect',
      width: readNumericAttribute(tag, 'width'),
      x: readNumericAttribute(tag, 'x'),
      y: readNumericAttribute(tag, 'y'),
    };
    if ([annotation.x, annotation.y, annotation.width, annotation.height].every(Number.isFinite)) annotations.push(annotation);
  }
  for (const match of figure.matchAll(/<line\b[^>]*class="[^"]*\bsi-media-annotation__arrow\b[^"]*"[^>]*\/?\s*>/gim)) {
    const tag = match[0];
    const annotation = {
      type: 'arrow',
      x1: readNumericAttribute(tag, 'x1'),
      x2: readNumericAttribute(tag, 'x2'),
      y1: readNumericAttribute(tag, 'y1'),
      y2: readNumericAttribute(tag, 'y2'),
    };
    if ([annotation.x1, annotation.y1, annotation.x2, annotation.y2].every(Number.isFinite)) annotations.push(annotation);
  }
  return annotations;
}

function findGeneratedMedia(source) {
  const media = [];
  for (const match of source.matchAll(GENERATED_FIGURE_PATTERN)) {
    const figure = match[0];
    const openingTag = figure.match(/^<figure\b[^>]*>/i)?.[0] ?? '';
    const imageTags = [...figure.matchAll(/<img\b[^>]*>/gim)].map((imageMatch) => imageMatch[0]);
    const darkTag = imageTags.find((tag) => /\bsi-themed-screenshot__image--dark\b/.test(readHtmlAttribute(tag, 'class') ?? ''));
    const lightTag = imageTags.find((tag) => /\bsi-themed-screenshot__image--light\b/.test(readHtmlAttribute(tag, 'class') ?? ''));
    if (!darkTag || !lightTag) continue;

    const darkUrl = readHtmlAttribute(darkTag, 'src');
    const lightUrl = readHtmlAttribute(lightTag, 'src');
    const width = readNumericAttribute(darkTag, 'width');
    const height = readNumericAttribute(darkTag, 'height');
    if (!darkUrl || !lightUrl || !width || !height) continue;

    const style = readHtmlAttribute(openingTag, 'style') ?? '';
    const styleWidth = Number(style.match(/--si-screenshot-width:\s*([\d.]+)px/i)?.[1]);
    const displayWidth = Number.isFinite(styleWidth) && styleWidth > 0 ? styleWidth : Math.round(width / 2);
    const svgTag = figure.match(/<svg\b[^>]*class="[^"]*\bsi-media-annotation\b[^"]*"[^>]*>/i)?.[0];
    const viewBox = readHtmlAttribute(svgTag ?? '', 'viewBox')?.trim().split(/\s+/).map(Number);
    const captureWidth = readNumericAttribute(openingTag, 'data-capture-width')
      ?? (viewBox?.length === 4 && Number.isFinite(viewBox[2]) ? viewBox[2] : displayWidth);
    const captureHeight = readNumericAttribute(openingTag, 'data-capture-height')
      ?? (viewBox?.length === 4 && Number.isFinite(viewBox[3]) ? viewBox[3] : displayWidth * height / width);
    const sourceId = path.basename(darkUrl).replace(/-dark\.[^.]+$/i, '');
    const captionMatch = figure.match(/<figcaption>([\s\S]*?)<\/figcaption>/i);

    media.push({
      alt: readHtmlAttribute(darkTag, 'alt') ?? 'Изображение',
      annotations: parseGeneratedAnnotations(figure),
      caption: captionMatch ? decodeHtml(captionMatch[1].replace(/<[^>]+>/g, '').trim()) : '',
      captureHeight,
      captureWidth,
      darkUrl,
      displayWidth,
      end: match.index + figure.length,
      height,
      id: readHtmlAttribute(openingTag, 'data-media-id') ?? sourceId,
      lightUrl,
      mediaKind: readHtmlAttribute(openingTag, 'data-media-kind') === 'illustration' ? 'illustration' : 'screenshot',
      raw: figure,
      start: match.index,
      width,
    });
  }
  return media;
}

async function findChromeExecutable() {
  const candidates = [
    process.env.SCREENSHOT_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Проверяем следующий известный путь.
    }
  }

  return undefined;
}

async function installOverlay(page, task) {
  if (page.isClosed()) return;
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.evaluate((overlayTask) => {
    const previous = document.querySelector('#si-screenshot-wizard');
    previous?.remove();

    const host = document.createElement('div');
    host.id = 'si-screenshot-wizard';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    document.documentElement.append(host);

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        .toolbar {
          position: fixed;
          z-index: 3;
          top: 14px;
          right: 14px;
          width: min(410px, calc(100vw - 28px));
          max-height: calc(100vh - 28px);
          overflow: auto;
          padding: 16px;
          border: 1px solid #45454f;
          border-radius: 12px;
          background: #202126;
          color: #f2f2f7;
          font: 13px/1.45 Inter, system-ui, sans-serif;
          box-shadow: 0 18px 50px rgba(0,0,0,.42);
          pointer-events: auto;
        }
        .toolbar.left { right: auto; left: 14px; }
        .topline { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .counter { color:#f9a605; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
        .move { width:32px; min-height:28px; padding:0; }
        h2 { margin:6px 0 10px; font-size:17px; line-height:1.25; }
        .context { max-height:150px; overflow:auto; margin:0 0 12px; padding:10px; border-radius:8px; background:#292930; color:#c6c3cf; white-space:pre-wrap; }
        .context strong { color:#fff; }
        label { display:grid; gap:4px; margin-top:9px; color:#aaa7b2; font-size:11px; font-weight:700; text-transform:uppercase; }
        input, textarea {
          width:100%;
          border:1px solid #45454f;
          border-radius:7px;
          background:#2f2f37;
          color:#fff;
          font:13px/1.4 Inter, system-ui, sans-serif;
          padding:8px 9px;
          text-transform:none;
        }
        textarea { min-height:54px; resize:vertical; }
        input:disabled, textarea:disabled { opacity:.62; }
        .row { display:grid; grid-template-columns:1fr 112px; gap:8px; }
        .dimensions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .hint { margin:10px 0; color:#aaa7b2; font-size:12px; }
        .selection-info { margin:8px 0 0; color:#f9a605; font-size:12px; }
        .buttons { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:11px; }
        .annotation-tools { display:grid; grid-template-columns:1fr 1fr 40px 40px; gap:7px; margin-top:8px; }
        button {
          min-height:36px;
          border:1px solid #4b4b56;
          border-radius:8px;
          background:#2f2f37;
          color:#f2f2f7;
          font:700 12px/1.2 Inter, system-ui, sans-serif;
          cursor:pointer;
        }
        button:hover:not(:disabled) { border-color:#f9a605; color:#f9a605; }
        button.primary { border-color:#f9a605; background:#f9a605; color:#19191d; }
        button.active { border-color:#f9a605; color:#f9a605; box-shadow:inset 0 0 0 1px #f9a605; }
        button:disabled { cursor:not-allowed; opacity:.45; }
        .status { min-height:20px; margin:10px 0 0; color:#45ba8d; font-size:12px; }
        .error { color:#ff8082; }
        .selection-layer { position:fixed; z-index:1; inset:0; pointer-events:none; }
        .selection-layer.active { cursor:crosshair; pointer-events:auto; }
        .selection-layer.selecting { background:rgba(0,0,0,.12); }
        .selection-box { position:fixed; z-index:2; display:none; border:2px solid #f9a605; background:rgba(249,166,5,.08); box-shadow:0 0 0 1px rgba(0,0,0,.7); pointer-events:none; }
        .annotation-svg { position:fixed; z-index:2; display:none; overflow:visible; pointer-events:none; }
        .annotation-svg .halo { fill:none; stroke:rgba(18,18,22,.9); stroke-width:7; vector-effect:non-scaling-stroke; }
        .annotation-svg .shape { fill:rgba(249,166,5,.08); stroke:#f9a605; stroke-width:3; vector-effect:non-scaling-stroke; }
        .annotation-svg .arrow { fill:none; }
        .annotation-svg .arrowhead { fill:#f9a605; stroke:rgba(18,18,22,.9); stroke-width:1.5; vector-effect:non-scaling-stroke; }
      </style>
      <div class="selection-layer"></div>
      <div class="selection-box"></div>
      <svg class="annotation-svg" aria-hidden="true"></svg>
      <section class="toolbar" aria-label="Мастер скриншотов">
        <div class="topline">
          <span class="counter"></span>
          <button class="move" type="button" title="Переместить панель">↔</button>
        </div>
        <h2></h2>
        <div class="context"></div>
        <label>Имя файла<input class="id" type="text" /></label>
        <div class="dimensions">
          <label>Ширина файла, макс.<input class="width" type="number" min="320" max="4000" step="1" /></label>
          <label>Ширина в статье<input class="display-width" type="number" min="40" max="4000" step="1" /></label>
        </div>
        <label>Alt<textarea class="alt"></textarea></label>
        <label>Подпись, необязательно<textarea class="caption"></textarea></label>
        <p class="hint"></p>
        <button class="select" type="button">Выделить область</button>
        <p class="selection-info">Область ещё не выбрана</p>
        <div class="annotation-tools">
          <button class="add-rect" type="button" disabled>▭ Рамка</button>
          <button class="add-arrow" type="button" disabled>↗ Стрелка</button>
          <button class="undo" type="button" title="Отменить последнюю аннотацию" disabled>↶</button>
          <button class="clear" type="button" title="Удалить все аннотации" disabled>×</button>
        </div>
        <div class="buttons">
          <button class="capture-dark" type="button" disabled>Снять тёмную</button>
          <button class="capture-light" type="button" disabled>Снять светлую</button>
          <button class="reset" type="button">Сбросить</button>
          <button class="skip" type="button">Пропустить</button>
        </div>
        <button class="finish primary" type="button" disabled style="width:100%;margin-top:8px">Вставить в статью</button>
        <p class="status" aria-live="polite"></p>
      </section>
    `;

    const get = (selector) => shadow.querySelector(selector);
    const toolbar = get('.toolbar');
    const layer = get('.selection-layer');
    const box = get('.selection-box');
    const annotationSvg = get('.annotation-svg');
    const idInput = get('.id');
    const widthInput = get('.width');
    const displayWidthInput = get('.display-width');
    const altInput = get('.alt');
    const captionInput = get('.caption');
    const selectButton = get('.select');
    const rectButton = get('.add-rect');
    const arrowButton = get('.add-arrow');
    const undoButton = get('.undo');
    const clearButton = get('.clear');
    const darkButton = get('.capture-dark');
    const lightButton = get('.capture-light');
    const finishButton = get('.finish');
    const status = get('.status');
    const selectionInfo = get('.selection-info');
    const annotationOnly = overlayTask.mode === 'annotate';
    let rect = overlayTask.initialRect ? { ...overlayTask.initialRect } : undefined;
    let start;
    let draftAnnotation;
    let interactionMode;
    let annotations = Array.isArray(overlayTask.initialAnnotations)
      ? overlayTask.initialAnnotations.map((annotation) => ({ ...annotation }))
      : [];
    let capturedDark = false;
    let capturedLight = false;
    let locked = false;

    const mediaLabel = overlayTask.mediaKind === 'illustration' ? 'Картинка' : 'Скриншот';
    get('.counter').textContent = `${mediaLabel} ${overlayTask.index} из ${overlayTask.total}`;
    get('h2').textContent = overlayTask.context.heading;
    get('.context').textContent = [
      overlayTask.context.before && `До:\n${overlayTask.context.before}`,
      overlayTask.context.after && `После:\n${overlayTask.context.after}`,
    ].filter(Boolean).join('\n\n');
    idInput.value = overlayTask.defaultId;
    widthInput.value = String(overlayTask.outputWidth);
    displayWidthInput.value = overlayTask.displayWidth ? String(overlayTask.displayWidth) : '';
    altInput.value = overlayTask.defaultAlt;
    captionInput.value = overlayTask.caption ?? '';
    get('.hint').textContent = annotationOnly
      ? 'Добавьте или удалите рамки и стрелки. Изображение переснимать не нужно.'
      : overlayTask.mediaKind === 'illustration'
        ? 'Статическая картинка будет помечена как не требующая актуализации. Выберите область, при необходимости добавьте рамки или стрелки и снимите обе темы.'
        : 'Выберите область, при необходимости добавьте рамки или стрелки. Затем переключайте тему приложения и делайте оба снимка.';

    if (annotationOnly) {
      selectButton.hidden = true;
      darkButton.hidden = true;
      lightButton.hidden = true;
      get('.reset').hidden = true;
      finishButton.textContent = 'Сохранить аннотации';
    }

    const showStatus = (message, isError = false) => {
      status.textContent = message;
      status.classList.toggle('error', isError);
    };

    const updateButtons = () => {
      const hasRect = Boolean(rect);
      darkButton.disabled = !hasRect;
      lightButton.disabled = !hasRect;
      finishButton.disabled = annotationOnly ? false : !(capturedDark && capturedLight && altInput.value.trim());
      idInput.disabled = locked || annotationOnly;
      widthInput.disabled = locked || annotationOnly;
      displayWidthInput.disabled = locked || annotationOnly;
      altInput.disabled = annotationOnly;
      captionInput.disabled = annotationOnly;
      selectButton.disabled = locked || annotationOnly;
      rectButton.disabled = !hasRect || locked;
      arrowButton.disabled = !hasRect || locked;
      undoButton.disabled = annotations.length === 0 || locked;
      clearButton.disabled = annotations.length === 0 || locked;
      rectButton.classList.toggle('active', interactionMode === 'rect');
      arrowButton.classList.toggle('active', interactionMode === 'arrow');
    };

    const setInteractionMode = (mode) => {
      interactionMode = mode;
      layer.classList.toggle('active', Boolean(mode));
      layer.classList.toggle('selecting', mode === 'select');
      updateButtons();
    };

    const annotationToSvg = (annotation) => {
      if (annotation.type === 'rect') {
        const attributes = `x="${annotation.x}" y="${annotation.y}" width="${annotation.width}" height="${annotation.height}" rx="6"`;
        return `<rect class="halo" ${attributes}></rect><rect class="shape" ${attributes}></rect>`;
      }
      const attributes = `x1="${annotation.x1}" y1="${annotation.y1}" x2="${annotation.x2}" y2="${annotation.y2}"`;
      return `<line class="halo" ${attributes}></line><line class="shape arrow" ${attributes} marker-end="url(#si-wizard-arrow)"></line>`;
    };

    const drawAnnotations = () => {
      if (!rect) {
        annotationSvg.style.display = 'none';
        annotationSvg.innerHTML = '';
        return;
      }
      Object.assign(annotationSvg.style, {
        display: 'block',
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
      annotationSvg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
      annotationSvg.setAttribute('preserveAspectRatio', 'none');
      annotationSvg.innerHTML = `
        <defs>
          <marker id="si-wizard-arrow" markerWidth="16" markerHeight="16" refX="13" refY="7" orient="auto" markerUnits="userSpaceOnUse">
            <path class="arrowhead" d="M 0 0 L 14 7 L 0 14 L 3.5 7 z"></path>
          </marker>
        </defs>
        ${[...annotations, ...(draftAnnotation ? [draftAnnotation] : [])].map(annotationToSvg).join('')}
      `;
    };

    const drawRect = () => {
      if (!rect) {
        box.style.display = 'none';
        selectionInfo.textContent = 'Область ещё не выбрана';
        drawAnnotations();
        return;
      }
      Object.assign(box.style, {
        display: 'block',
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
      const annotationText = annotations.length > 0 ? ` · аннотаций: ${annotations.length}` : '';
      selectionInfo.textContent = `Область: ${Math.round(rect.width)} × ${Math.round(rect.height)} px${annotationText}`;
      drawAnnotations();
    };

    get('.move').addEventListener('click', () => toolbar.classList.toggle('left'));

    selectButton.addEventListener('click', () => {
      annotations = [];
      draftAnnotation = undefined;
      setInteractionMode('select');
      showStatus('Протяните рамку вокруг нужной области.');
    });

    rectButton.addEventListener('click', () => {
      setInteractionMode('rect');
      showStatus('Протяните рамку внутри выбранной области.');
    });

    arrowButton.addEventListener('click', () => {
      setInteractionMode('arrow');
      showStatus('Протяните стрелку от начала к её острию.');
    });

    undoButton.addEventListener('click', () => {
      annotations.pop();
      drawRect();
      updateButtons();
      showStatus('Последняя аннотация удалена.');
    });

    clearButton.addEventListener('click', () => {
      annotations = [];
      drawRect();
      updateButtons();
      showStatus('Все аннотации удалены.');
    });

    const relativePoint = (event) => ({
      x: Math.min(rect.width, Math.max(0, event.clientX - rect.x)),
      y: Math.min(rect.height, Math.max(0, event.clientY - rect.y)),
    });

    layer.addEventListener('pointerdown', (event) => {
      if (!interactionMode) return;
      if (interactionMode === 'select') {
        start = { mode: 'select', x: event.clientX, y: event.clientY };
        rect = { x: start.x, y: start.y, width: 0, height: 0 };
      } else {
        if (!rect || event.clientX < rect.x || event.clientX > rect.x + rect.width || event.clientY < rect.y || event.clientY > rect.y + rect.height) {
          showStatus('Начните рисовать внутри выбранной области.', true);
          return;
        }
        const point = relativePoint(event);
        start = { mode: interactionMode, ...point };
        draftAnnotation = interactionMode === 'rect'
          ? { height: 0, type: 'rect', width: 0, x: point.x, y: point.y }
          : { type: 'arrow', x1: point.x, x2: point.x, y1: point.y, y2: point.y };
      }
      layer.setPointerCapture(event.pointerId);
      drawRect();
    });

    layer.addEventListener('pointermove', (event) => {
      if (!start) return;
      if (start.mode === 'select') {
        rect = {
          x: Math.min(start.x, event.clientX),
          y: Math.min(start.y, event.clientY),
          width: Math.abs(event.clientX - start.x),
          height: Math.abs(event.clientY - start.y),
        };
      } else {
        const point = relativePoint(event);
        draftAnnotation = start.mode === 'rect'
          ? {
              height: Math.abs(point.y - start.y),
              type: 'rect',
              width: Math.abs(point.x - start.x),
              x: Math.min(start.x, point.x),
              y: Math.min(start.y, point.y),
            }
          : { type: 'arrow', x1: start.x, x2: point.x, y1: start.y, y2: point.y };
      }
      drawRect();
    });

    layer.addEventListener('pointerup', (event) => {
      if (!start) return;
      layer.releasePointerCapture(event.pointerId);
      const completedMode = start.mode;
      start = undefined;
      setInteractionMode(undefined);
      if (completedMode === 'select') {
        if (rect.width < 40 || rect.height < 40) {
          rect = undefined;
          displayWidthInput.value = '';
          showStatus('Область слишком мала. Выделите её ещё раз.', true);
        } else {
          displayWidthInput.value = String(Math.round(rect.width));
          showStatus('Область выбрана. При необходимости добавьте рамки или стрелки.');
        }
      } else {
        const isValid = completedMode === 'rect'
          ? draftAnnotation.width >= 8 && draftAnnotation.height >= 8
          : Math.hypot(draftAnnotation.x2 - draftAnnotation.x1, draftAnnotation.y2 - draftAnnotation.y1) >= 12;
        if (isValid) {
          annotations.push(draftAnnotation);
          showStatus(`${completedMode === 'rect' ? 'Рамка' : 'Стрелка'} добавлена.`);
        } else {
          showStatus('Аннотация слишком мала и не была добавлена.', true);
        }
        draftAnnotation = undefined;
      }
      drawRect();
      updateButtons();
    });

    const capture = async (theme) => {
      showStatus(`Сохраняю ${theme === 'dark' ? 'тёмную' : 'светлую'} версию…`);
      darkButton.disabled = true;
      lightButton.disabled = true;
      try {
        const response = await globalThis.__siScreenshotAction({
          action: 'capture',
          displayWidth: Number(displayWidthInput.value),
          id: idInput.value,
          outputWidth: Number(widthInput.value),
          rect,
          theme,
        });
        if (!response.ok) throw new Error(response.error);
        locked = true;
        if (theme === 'dark') {
          capturedDark = true;
          darkButton.textContent = 'Тёмная ✓';
        } else {
          capturedLight = true;
          lightButton.textContent = 'Светлая ✓';
        }
        showStatus(`${theme === 'dark' ? 'Тёмная' : 'Светлая'} версия сохранена: ${response.width} × ${response.height} px.`);
      } catch (error) {
        showStatus(error.message || String(error), true);
      }
      updateButtons();
    };

    darkButton.addEventListener('click', () => capture('dark'));
    lightButton.addEventListener('click', () => capture('light'));

    get('.reset').addEventListener('click', async () => {
      await globalThis.__siScreenshotAction({ action: 'reset' });
      capturedDark = false;
      capturedLight = false;
      locked = false;
      rect = undefined;
      annotations = [];
      draftAnnotation = undefined;
      displayWidthInput.value = '';
      setInteractionMode(undefined);
      darkButton.textContent = 'Снять тёмную';
      lightButton.textContent = 'Снять светлую';
      drawRect();
      updateButtons();
      showStatus('Снимки сброшены. Выберите область заново.');
    });

    get('.skip').addEventListener('click', async () => {
      await globalThis.__siScreenshotAction({ action: 'skip' });
    });

    finishButton.addEventListener('click', async () => {
      const response = await globalThis.__siScreenshotAction({
        action: annotationOnly ? 'finish-annotations' : 'finish',
        alt: altInput.value,
        annotations,
        caption: captionInput.value,
        id: idInput.value,
      });
      if (!response.ok) showStatus(response.error, true);
    });

    altInput.addEventListener('input', updateButtons);
    drawRect();
    updateButtons();
  }, task);
}

async function saveScreenshot({ page, payload, session, stagingDirectory, outputDirectory, assetDirectoryUrl, quality }) {
  const id = slugify(payload.id, session.task.defaultId);
  if (!id) throw new Error('Укажите имя файла.');
  if (session.usedIds.has(id)) throw new Error(`Имя «${id}» уже использовано для другого скриншота в этой статье.`);
  if (!payload.rect) throw new Error('Сначала выделите область.');
  if (!Number.isInteger(payload.outputWidth) || payload.outputWidth < 320 || payload.outputWidth > 4000) {
    throw new Error('Максимальная ширина должна быть от 320 до 4000 px.');
  }
  if (!Number.isInteger(payload.displayWidth) || payload.displayWidth < 40 || payload.displayWidth > 4000) {
    throw new Error('Ширина в статье должна быть от 40 до 4000 px.');
  }

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Не удалось определить размер окна браузера.');
  const clip = {
    x: Math.max(0, Math.floor(payload.rect.x)),
    y: Math.max(0, Math.floor(payload.rect.y)),
    width: Math.floor(payload.rect.width),
    height: Math.floor(payload.rect.height),
  };
  clip.width = Math.min(clip.width, viewport.width - clip.x);
  clip.height = Math.min(clip.height, viewport.height - clip.y);
  if (clip.width < 40 || clip.height < 40) throw new Error('Выбранная область слишком мала.');

  if (session.captureSettings) {
    const previous = session.captureSettings;
    const sameRect = ['x', 'y', 'width', 'height'].every((key) => previous.clip[key] === clip[key]);
    if (!sameRect || previous.id !== id || previous.outputWidth !== payload.outputWidth || previous.displayWidth !== payload.displayWidth) {
      throw new Error('Для обеих тем нужны одинаковые область, имя и ширина. Нажмите «Сбросить» и снимите версии заново.');
    }
  } else {
    session.captureSettings = { clip, displayWidth: payload.displayWidth, id, outputWidth: payload.outputWidth };
  }

  await page.evaluate(() => {
    const wizard = document.querySelector('#si-screenshot-wizard');
    if (wizard) wizard.style.visibility = 'hidden';
  });

  let png;
  try {
    await page.waitForTimeout(120);
    png = await page.screenshot({
      animations: 'disabled',
      caret: 'hide',
      type: 'png',
    });
  } finally {
    await page.evaluate(() => {
      const wizard = document.querySelector('#si-screenshot-wizard');
      if (wizard) wizard.style.visibility = 'visible';
    }).catch(() => {});
  }

  await mkdir(stagingDirectory, { recursive: true });
  const fileName = `${id}-${payload.theme}.webp`;
  const stagingPath = path.join(stagingDirectory, fileName);
  const finalPath = path.join(outputDirectory, fileName);
  const metadata = await sharp(png).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Не удалось прочитать созданный снимок.');
  const scaleX = metadata.width / viewport.width;
  const scaleY = metadata.height / viewport.height;
  const pixelClip = {
    left: Math.round(clip.x * scaleX),
    top: Math.round(clip.y * scaleY),
    width: Math.round(clip.width * scaleX),
    height: Math.round(clip.height * scaleY),
  };
  pixelClip.width = Math.min(pixelClip.width, metadata.width - pixelClip.left);
  pixelClip.height = Math.min(pixelClip.height, metadata.height - pixelClip.top);
  const targetWidth = Math.min(payload.outputWidth, pixelClip.width);
  const info = await sharp(png)
    .extract(pixelClip)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ effort: 5, quality, smartSubsample: true })
    .toFile(stagingPath);

  session.captures.set(payload.theme, {
    finalPath,
    height: info.height,
    stagingPath,
    url: `${assetDirectoryUrl}/${fileName}`,
    width: info.width,
  });
  session.generatedFiles.add(stagingPath);

  return { height: info.height, width: info.width };
}

function scaleAnnotations(annotations, fromWidth, fromHeight, toWidth, toHeight) {
  const scaleX = toWidth / fromWidth;
  const scaleY = toHeight / fromHeight;
  return annotations.map((annotation) => annotation.type === 'rect'
    ? {
        height: annotation.height * scaleY,
        type: 'rect',
        width: annotation.width * scaleX,
        x: annotation.x * scaleX,
        y: annotation.y * scaleY,
      }
    : {
        type: 'arrow',
        x1: annotation.x1 * scaleX,
        x2: annotation.x2 * scaleX,
        y1: annotation.y1 * scaleY,
        y2: annotation.y2 * scaleY,
      });
}

async function assetUrlToDataUrl(assetUrl) {
  const cleanUrl = decodeURIComponent(assetUrl.split(/[?#]/, 1)[0]);
  if (!cleanUrl.startsWith('/')) throw new Error(`Ожидался локальный путь к изображению: ${assetUrl}`);
  const assetPath = path.resolve(ROOT_DIR, 'public', cleanUrl.slice(1));
  const publicDirectory = path.resolve(ROOT_DIR, 'public');
  if (!assetPath.startsWith(`${publicDirectory}${path.sep}`)) throw new Error(`Путь выходит за пределы public: ${assetUrl}`);
  const extension = path.extname(assetPath).toLocaleLowerCase('en');
  const mime = extension === '.png' ? 'image/png' : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/webp';
  const contents = await readFile(assetPath);
  return `data:${mime};base64,${contents.toString('base64')}`;
}

async function annotateGeneratedMedia({ articlePath, media, source }) {
  const chromeExecutable = await findChromeExecutable();
  const profileDirectory = path.join(ROOT_DIR, '.cache/screenshot-annotation-browser');
  await mkdir(profileDirectory, { recursive: true });
  const context = await chromium.launchPersistentContext(profileDirectory, {
    ...(chromeExecutable ? { executablePath: chromeExecutable } : { channel: 'chrome' }),
    bypassCSP: true,
    deviceScaleFactor: 2,
    headless: false,
    viewport: { height: 900, width: 1440 },
  });
  runtimeContext = context;
  const page = context.pages()[0] ?? (await context.newPage());
  let activeSession;

  context.on('close', () => {
    if (activeSession) {
      activeSession.reject(new Error('Браузер был закрыт до завершения работы.'));
      activeSession = undefined;
    }
  });

  await context.exposeBinding('__siScreenshotAction', async (_source, payload) => {
    if (!activeSession) return { error: 'Нет активного задания.', ok: false };
    if (payload.action === 'skip') {
      activeSession.resolve({ skipped: true });
      activeSession = undefined;
      return { ok: true };
    }
    if (payload.action === 'finish-annotations') {
      activeSession.resolve({
        annotations: normalizeAnnotations(payload.annotations, activeSession.width, activeSession.height),
        height: activeSession.height,
        width: activeSession.width,
      });
      activeSession = undefined;
      return { ok: true };
    }
    return { error: 'В режиме аннотаций пересъёмка отключена.', ok: false };
  });

  const replacements = [];
  for (let index = 0; index < media.length; index += 1) {
    const item = media[index];
    const imageDataUrl = await assetUrlToDataUrl(item.darkUrl);
    const workspaceWidth = Math.max(160, Math.min(item.displayWidth, 960));
    await page.setContent(`<!doctype html>
      <html><head><meta charset="utf-8"><style>
        html,body{margin:0;min-height:100%;background:#18181c}
        body{display:flex;min-height:100vh;align-items:center;padding:20px 460px 20px 20px;box-sizing:border-box}
        img{display:block;width:${workspaceWidth}px;max-width:calc(100vw - 500px);max-height:calc(100vh - 40px);height:auto;object-fit:contain}
      </style></head><body><img id="si-annotation-target" src="${imageDataUrl}" alt=""></body></html>`, { waitUntil: 'load' });
    const imageBox = await page.locator('#si-annotation-target').boundingBox();
    if (!imageBox || imageBox.width < 40 || imageBox.height < 40) {
      throw new Error(`Не удалось открыть изображение ${item.darkUrl} для аннотирования.`);
    }

    const initialAnnotations = scaleAnnotations(
      item.annotations,
      item.captureWidth,
      item.captureHeight,
      imageBox.width,
      imageBox.height,
    );
    const task = {
      caption: item.caption,
      context: { after: '', before: item.alt, heading: item.alt },
      defaultAlt: item.alt,
      defaultId: item.id,
      displayWidth: item.displayWidth,
      index: index + 1,
      initialAnnotations,
      initialRect: imageBox,
      mediaKind: item.mediaKind,
      mode: 'annotate',
      outputWidth: item.width,
      total: media.length,
    };

    console.log(`\n[${index + 1}/${media.length}] Аннотации: ${item.id}`);
    const resultPromise = new Promise((resolve, reject) => {
      activeSession = { height: imageBox.height, reject, resolve, task, width: imageBox.width };
    });
    await installOverlay(page, task);
    const result = await resultPromise;
    if (result.skipped) {
      console.log('Пропущено без изменений.');
      continue;
    }

    const updatedItem = {
      ...item,
      annotations: result.annotations,
      captureHeight: result.height,
      captureWidth: result.width,
    };
    replacements.push({ end: item.end, markup: renderScreenshotMarkup(updatedItem), start: item.start });
    console.log(`Сохранено аннотаций: ${result.annotations.length}`);
  }

  let updatedSource = source;
  for (const replacement of replacements.toReversed()) {
    updatedSource = `${updatedSource.slice(0, replacement.start)}${replacement.markup}${updatedSource.slice(replacement.end)}`;
  }
  if (updatedSource !== source) {
    await writeFile(articlePath, updatedSource);
    console.log(`\nСтатья обновлена: ${path.relative(ROOT_DIR, articlePath)}`);
  }

  await context.close();
  runtimeContext = undefined;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.article) {
    printHelp();
    throw new Error('Укажите путь к статье.');
  }

  const { articlePath, relativePath } = normalizeArticlePath(options.article);
  const source = await readFile(articlePath, 'utf8');
  if (options.annotate) {
    const generatedMedia = findGeneratedMedia(source);
    if (generatedMedia.length === 0) {
      console.log('В статье нет созданных тематических изображений для аннотирования.');
      return;
    }
    await annotateGeneratedMedia({ articlePath, media: generatedMedia, source });
    return;
  }
  const markers = findMarkers(source);
  if (markers.length === 0) {
    console.log('В статье нет маркеров [скриншот], [скриншот: id] или [картинка: id].');
    return;
  }

  if (options.list) {
    console.log(`Найдено маркеров: ${markers.length}\n`);
    for (let index = 0; index < markers.length; index += 1) {
      const marker = markers[index];
      const context = extractContext(source, marker);
      const fallbackId = `${String(index + 1).padStart(2, '0')}-${marker.mediaKind === 'illustration' ? 'image' : 'screenshot'}`;
      const id = slugify(marker.explicitId ?? '', fallbackId);
      const kind = marker.mediaKind === 'illustration' ? 'картинка' : 'скриншот';
      console.log(`${index + 1}. ${id} [${kind}] — ${context.heading}`);
      if (context.before) console.log(`   До: ${context.before.slice(0, 160)}`);
      if (context.after) console.log(`   После: ${context.after.slice(0, 160)}`);
      console.log('');
    }
    return;
  }

  const articleSlug = relativePath.replace(/\.mdx?$/i, '').split(path.sep).join('/');
  const outputDirectory = path.join(ASSETS_DIR, ...articleSlug.split('/'));
  const stagingRoot = path.join(ROOT_DIR, '.cache/screenshot-captures', `${Date.now()}-${process.pid}`);
  const stagingDirectory = path.join(stagingRoot, ...articleSlug.split('/'));
  runtimeStagingDirectory = stagingRoot;
  const assetDirectoryUrl = `/help-assets/screenshots/${articleSlug}`;
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  const startUrl = options.startUrl || (await reader.question(`Стартовая страница [${DEFAULT_START_URL}]: `)) || DEFAULT_START_URL;
  reader.close();

  const chromeExecutable = await findChromeExecutable();
  const profileDirectory = path.join(ROOT_DIR, '.cache/screenshot-browser');
  await mkdir(profileDirectory, { recursive: true });
  const context = await chromium.launchPersistentContext(profileDirectory, {
    ...(chromeExecutable ? { executablePath: chromeExecutable } : { channel: 'chrome' }),
    bypassCSP: true,
    deviceScaleFactor: 2,
    headless: false,
    viewport: { height: 900, width: 1440 },
  });
  runtimeContext = context;
  const page = context.pages()[0] ?? (await context.newPage());
  let activeSession;

  context.on('close', () => {
    if (activeSession) {
      activeSession.reject(new Error('Браузер был закрыт до завершения работы.'));
      activeSession = undefined;
    }
  });

  await context.exposeBinding('__siScreenshotAction', async ({ page: actionPage }, payload) => {
    if (!activeSession) return { error: 'Нет активного задания.', ok: false };

    try {
      if (payload.action === 'capture') {
        const size = await saveScreenshot({
          assetDirectoryUrl,
          outputDirectory,
          page: actionPage,
          payload,
          quality: options.quality,
          session: activeSession,
          stagingDirectory,
        });
        return { ok: true, ...size };
      }

      if (payload.action === 'reset') {
        for (const file of activeSession.generatedFiles) {
          await rm(file, { force: true });
        }
        activeSession.captureSettings = undefined;
        activeSession.captures.clear();
        activeSession.generatedFiles.clear();
        return { ok: true };
      }

      if (payload.action === 'skip') {
        for (const file of activeSession.generatedFiles) {
          await rm(file, { force: true });
        }
        activeSession.resolve({ skipped: true });
        activeSession = undefined;
        return { ok: true };
      }

      if (payload.action === 'finish') {
        const dark = activeSession.captures.get('dark');
        const light = activeSession.captures.get('light');
        if (!dark || !light) return { error: 'Сначала сделайте обе версии.', ok: false };
        if (!payload.alt?.trim()) return { error: 'Заполните alt.', ok: false };
        if (dark.width !== light.width || dark.height !== light.height) {
          return { error: 'Размеры версий не совпадают. Сбросьте и снимите их заново.', ok: false };
        }

        const result = {
          alt: payload.alt.trim(),
          annotations: normalizeAnnotations(
            payload.annotations,
            activeSession.captureSettings.clip.width,
            activeSession.captureSettings.clip.height,
          ),
          caption: payload.caption?.trim() ?? '',
          captureHeight: activeSession.captureSettings.clip.height,
          captureWidth: activeSession.captureSettings.clip.width,
          captures: [dark, light],
          darkUrl: dark.url,
          displayWidth: activeSession.captureSettings.displayWidth,
          height: dark.height,
          id: activeSession.captureSettings.id,
          lightUrl: light.url,
          mediaKind: activeSession.task.mediaKind,
          width: dark.width,
        };
        activeSession.resolve(result);
        activeSession = undefined;
        return { ok: true };
      }

      return { error: `Неизвестное действие: ${payload.action}`, ok: false };
    } catch (error) {
      return { error: error.message ?? String(error), ok: false };
    }
  });

  page.on('domcontentloaded', () => {
    if (activeSession) installOverlay(page, activeSession.task).catch(() => {});
  });

  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  const replacements = [];
  const completedCaptures = [];
  const usedIds = new Set();

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const contextText = extractContext(source, marker);
    const fallbackId = `${String(index + 1).padStart(2, '0')}-${marker.mediaKind === 'illustration' ? 'image' : 'screenshot'}`;
    const defaultId = slugify(marker.explicitId ?? '', fallbackId);
    const task = {
      context: contextText,
      defaultAlt: contextText.heading,
      defaultId,
      index: index + 1,
      mediaKind: marker.mediaKind,
      outputWidth: options.width,
      total: markers.length,
    };

    console.log(`\n[${index + 1}/${markers.length}] ${contextText.heading}`);
    console.log(`Маркер: ${marker.raw.trim()}`);
    const resultPromise = new Promise((resolve, reject) => {
      activeSession = {
        captureSettings: undefined,
        captures: new Map(),
        generatedFiles: new Set(),
        reject,
        resolve,
        task,
        usedIds,
      };
    });
    await installOverlay(page, task);
    const result = await resultPromise;

    if (result.skipped) {
      console.log('Пропущено, маркер останется в статье.');
    } else {
      if (usedIds.has(result.id)) {
        throw new Error(`Имя скриншота «${result.id}» уже использовано в этой статье.`);
      }
      usedIds.add(result.id);
      completedCaptures.push(...result.captures);
      replacements.push({ end: marker.end, markup: renderScreenshotMarkup(result), start: marker.start });
      console.log(`Готово: ${result.darkUrl} и ${result.lightUrl}`);
    }
  }

  let updatedSource = source;
  for (const replacement of replacements.toReversed()) {
    updatedSource = `${updatedSource.slice(0, replacement.start)}${replacement.markup}${updatedSource.slice(replacement.end)}`;
  }
  if (updatedSource !== source) {
    await mkdir(outputDirectory, { recursive: true });
    for (const capture of completedCaptures) {
      await copyFile(capture.stagingPath, capture.finalPath);
    }
    await writeFile(articlePath, updatedSource);
    console.log(`\nСтатья обновлена: ${path.relative(ROOT_DIR, articlePath)}`);
  }

  await context.close();
  runtimeContext = undefined;
  await rm(stagingRoot, { force: true, recursive: true });
  runtimeStagingDirectory = undefined;
}

export {
  extractContext,
  findGeneratedMedia,
  findMarkers,
  installOverlay,
  normalizeAnnotations,
  renderScreenshotMarkup,
  saveScreenshot,
  scaleAnnotations,
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (error) => {
    await runtimeContext?.close().catch(() => {});
    if (runtimeStagingDirectory) {
      await rm(runtimeStagingDirectory, { force: true, recursive: true }).catch(() => {});
    }
    console.error(`\nОшибка: ${error.message ?? error}`);
    process.exitCode = 1;
  });
}
