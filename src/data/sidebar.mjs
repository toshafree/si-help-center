const sidebar = [
  { label: 'Главная', link: '/' },
  {
    label: 'С чего начать',
    items: [
      { label: 'Что такое Spread Insight', slug: 'getting-started/what-is-spread-insight' },
      { label: 'Обзор интерфейса', slug: 'getting-started/interface-overview' },
      { label: 'Что такое арбитраж', slug: 'getting-started/what-is-arbitrage' },
      { label: 'Первая сделка', slug: 'getting-started/first-trade' },
    ],
  },
  {
    label: 'Инструменты',
    collapsed: true,
    items: [
      {
        label: 'Стат. скринер',
        items: [
          { label: 'Обзор', slug: 'tools/stat-screener/overview' },
          { label: 'Скринер', slug: 'tools/stat-screener/screener' },
          { label: 'Бэктестер', slug: 'tools/stat-screener/backtester' },
          { label: 'Калькулятор', slug: 'tools/stat-screener/calculator' },
          { label: 'Уведомления', slug: 'tools/stat-screener/notifications' },
        ],
      },
      {
        label: 'Криптоскринер',
        items: [{ label: 'Обзор', slug: 'tools/crypto-screener/overview' }],
      },
      {
        label: 'Коллекции спредов',
        items: [
          { label: 'Обзор', slug: 'tools/spread-collections/overview' },
          { label: 'Свой скринер за 5 минут', slug: 'tools/spread-collections/custom-screener' },
        ],
      },
      {
        label: 'Конструктор спредов',
        items: [
          { label: 'Обзор', slug: 'tools/spread-builder/overview' },
          { label: 'Возможности формул', slug: 'tools/spread-builder/formulas' },
        ],
      },
    ],
  },
  {
    label: 'Стратегии и идеи',
    collapsed: true,
    items: [
      {
        label: 'Стат. арбитраж',
        items: [
          { label: 'Расхождение цен акций', slug: 'strategies/stat-arbitrage/price-divergence' },
          { label: 'Компании одной отрасли', slug: 'strategies/stat-arbitrage/industry-pair' },
          { label: 'Два типа акций', slug: 'strategies/stat-arbitrage/ordinary-preferred' },
          { label: 'Общий владелец', slug: 'strategies/stat-arbitrage/common-owner' },
          { label: 'Только коинтеграция', slug: 'strategies/stat-arbitrage/cointegration-only' },
        ],
      },
      {
        label: 'Криптоарбитраж',
        items: [
          { label: 'Разница цен', slug: 'strategies/crypto-arbitrage/price-difference' },
          { label: 'Сбор фандинга', slug: 'strategies/crypto-arbitrage/funding' },
          { label: 'Виды арбитража', slug: 'strategies/crypto-arbitrage/types' },
        ],
      },
    ],
  },
  {
    label: 'Техника',
    collapsed: true,
    items: [
      {
        label: 'Стат. арбитраж',
        items: [
          { label: 'Как искать пары', slug: 'technique/stat-arbitrage/find-pairs' },
          { label: 'Фиксация прибыли', slug: 'technique/stat-arbitrage/profit-taking' },
        ],
      },
      { label: 'График спреда', slug: 'technique/spread-chart' },
    ],
  },
  {
    label: 'Понятия и расчёты',
    collapsed: true,
    items: [
      { label: 'Коинтеграция и p-value', slug: 'concepts/cointegration' },
      { label: 'Bollinger Bands', slug: 'concepts/bollinger-bands' },
      { label: 'Расчёт позиции', slug: 'concepts/optimal-position' },
      { label: 'Стандартное отклонение', slug: 'concepts/standard-deviation' },
      { label: 'Что такое фандинг', slug: 'concepts/funding' },
      { label: 'Расчёт прибыли (крипта)', slug: 'concepts/crypto-profit' },
    ],
  },
  { label: 'Литература', slug: 'literature' },
  {
    label: 'Вебинары',
    collapsed: true,
    items: [
      { label: 'Преимущество инвестора', slug: 'webinars/investor-advantage' },
      { label: 'Практика по фьючерсам', slug: 'webinars/futures-practice' },
    ],
  },
  {
    label: 'Что нового',
    collapsed: true,
    items: [
      { label: 'v1.6.1 · Коллекции', slug: 'whats-new/v1-6-1-collections' },
      { label: 'v1.4.1', slug: 'whats-new/v1-4-1' },
      { label: 'v1.4.0 · ИИ-ассистент', slug: 'whats-new/v1-4-0-ai-assistant' },
      { label: 'Конструктор спредов', slug: 'whats-new/spread-builder' },
      { label: 'v1.2.0 · Криптоскринер', slug: 'whats-new/v1-2-0-crypto-screener' },
      { label: 'v1.2.0 · Telegram', slug: 'whats-new/v1-2-0-telegram-alerts' },
      { label: 'v1.1.0 · Автографик', slug: 'whats-new/v1-1-0-auto-chart' },
      { label: 'v1.1.0 · Расчёт сделки', slug: 'whats-new/v1-1-0-trade-calculation' },
    ],
  },
  { label: 'Сообщество', slug: 'community' },
];

export default sidebar;
