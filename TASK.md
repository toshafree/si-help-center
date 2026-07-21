# Задание: прототип центра знаний Spread Insight

## Цель

Собрать прототип центра знаний для Spread Insight (`spread-i.online`) на Astro Starlight с Markdown-статьями и Pagefind-поиском.

## Источник контента

- Текущий справочный раздел: `https://spread-i.online/help`.
- Раздел является SPA: исходный HTML содержит пустой `#app`, а контент загружается из JS и API.
- Обнаруженные API SPA:
  - `GET https://spread-i.online/api/get-topics`
  - `GET https://spread-i.online/api/get-article-by-slug?slug=<slug>`

## Требования

- Создать Astro Starlight-проект.
- Хранить статьи в Markdown/MDX в структуре Starlight.
- Подключить Pagefind-поиск.
- Перенести текущие статьи справки вместе с изображениями.
- Сохранить локальные копии изображений в проекте.
- Добавить логотип Spread Insight.
- Настроить светлую и темную темы.
- Приблизить цветовую схему и типографику к оригинальному сайту:
  - основной шрифт: Inter/sans-serif;
  - брендовый акцент: желтый `#ffc759`;
  - ссылка/логотипный синий: `rgb(18, 140, 255)`;
  - светлый фон: `#fafafc`, текст `#1a1a1f`;
  - темный фон: `#202027`/`#27272f`, текст `#ebebf2`.
- Добавить внешние ссылки:
  - Telegram: `https://t.me/spread_insight_online`
  - YouTube: `https://www.youtube.com/@spreadinsight`
  - Rutube: `https://rutube.ru/channel/58023809/`

## Вопросы и принятые допущения

- Нужна ли редактура статей или точный перенос? Для прототипа выполняется максимально близкий перенос текущего контента с технической адаптацией ссылок и изображений.
- Где должен жить центр знаний: на отдельном домене или под `/help`? Для прототипа собирается автономный Starlight-сайт с разделом документации на корне.
- Нужно ли сохранять оригинальные публичные URL картинок? Для надежности Pagefind/статической сборки картинки сохраняются локально в `src/assets/help/`.
- Нужна ли авторизация или интеграция с продуктом? Для прототипа не требуется.

## Критерии готовности

- Проект устанавливается и собирается через `npm run build`.
- Поиск Pagefind доступен в интерфейсе Starlight.
- Навигация отражает темы и статьи из текущего help-раздела.
- Изображения отображаются локально.
- Есть светлая и темная темы с кастомной палитрой.
- Логотип и ссылки на Telegram, YouTube, Rutube видны в интерфейсе.

## Деплой в обычный GitHub Pages repo

- Целевой репозиторий: `toshafree/si-help-center`.
- Целевой URL для обычного repo Pages: `https://toshafree.github.io/si-help-center/`.
- Для GitHub Pages используется отдельная команда `npm run build:github`.
- В режиме GitHub Pages Astro получает:
  - `site`: `https://<owner>.github.io`;
  - `base`: `/<repo>`, например `/si-help-center`.
- После сборки `scripts/prepare-github-pages.mjs` добавляет `.nojekyll` и переписывает root-relative ссылки на ассеты, Pagefind-индекс, sitemap и внутренние страницы под base path.
- Workflow расположен в `.github/workflows/deploy.yml` и запускается на push в `main` или вручную через `workflow_dispatch`.
- В настройках репозитория нужно один раз включить GitHub Pages:
  - `Settings` -> `Pages` -> `Build and deployment` -> `Source` -> `GitHub Actions`.
