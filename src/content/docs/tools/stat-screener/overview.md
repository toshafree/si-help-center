---
title: "Обзор скринера для статистического арбитража"
description: "Инструменты · Статистический скринер · 4 мин · 1 видео"
video: "1 видео"
---

<div class="si-video-block">
<si-video title="Spread Insight — скринер арбитражных возможностей" youtube="https://youtu.be/uK88zY67xT0" rutube="https://rutube.ru/video/3e3c03429baaf4dc6cd5a6bb6aef3142/"><span class="si-video__fallback">Смотреть видео: <a href="https://youtu.be/uK88zY67xT0">YouTube</a> · <a href="https://rutube.ru/video/3e3c03429baaf4dc6cd5a6bb6aef3142/">Rutube</a></span></si-video>
</div>

Арбитраж является перспективной возможностью заработка на фондовом рынке. Идея проста: временные отклонения цен двух связанных акций обычно возвращаются к среднему значению, позволяя трейдеру фиксировать прибыль.
Spread Insight - скринер пар инструментов, который поможет вам узнать о таких аномалиях быстрее остальных и получить прибыль, размещая заявки по нашим сигналам.
Spread Insight состоит из
- скринера, где можно отфильтровать аномалии по вашим критериям,
- бэктестера, в котором можно изучить потенциал прибыли и вероятность успеха сделки по конкретной паре,
- системы уведомлений о появлении новых пар или достижении спредом определенного уровня (скоро).

## Скринер арбитражных возможностей

Скринер позволяет отобрать пары, цены которых ходят согласовано, но в текущий момент сильно отклонились от своего среднего значения. По каждой паре скринер также дает возможность примерно рассчитать прибыльность арбитражной сделки.
<figure class="si-themed-screenshot">
  <img
    class="si-themed-screenshot__image si-themed-screenshot__image--dark"
    src="/help-assets/screenshots/tools/stat-screener/overview/01-screenshot-dark.webp"
    alt="Скринер арбитражных возможностей"
    width="1600"
    height="347"
    loading="lazy"
    decoding="async"
  />
  <img
    class="si-themed-screenshot__image si-themed-screenshot__image--light"
    src="/help-assets/screenshots/tools/stat-screener/overview/01-screenshot-light.webp"
    alt="Скринер арбитражных возможностей"
    width="1600"
    height="347"
    loading="lazy"
    decoding="async"
  />
</figure>
**Согласованность движения цен** инструментов в паре можно измерить через силу связи изменения цен в определенном периоде. Сила связи более 95% для всех периодов означает, что цены инструментов связаны чрезвычайно сильно. Для поиска интересных пар обычно достаточно двух периодов с силой связи более 95%. Дополнительно можно отфильтровать только пары инструментов, относящихся к одной индустрии, добавив к статистическому обоснованию их связи фундаментальную.
<figure class="si-themed-screenshot" style="--si-screenshot-width: 483px">
  <img
    class="si-themed-screenshot__image si-themed-screenshot__image--dark"
    src="/help-assets/screenshots/tools/stat-screener/overview/02-screenshot-dark.webp"
    alt="Скринер арбитражных возможностей"
    width="966"
    height="416"
    loading="lazy"
    decoding="async"
  />
  <img
    class="si-themed-screenshot__image si-themed-screenshot__image--light"
    src="/help-assets/screenshots/tools/stat-screener/overview/02-screenshot-light.webp"
    alt="Скринер арбитражных возможностей"
    width="966"
    height="416"
    loading="lazy"
    decoding="async"
  />
</figure>
**Значимость отклонения** оценивается по размеру отклонения, выраженному в стандартных отклонениях. Опытные трейдеры имеют свою шкалу значимости отклонений, но для большинства случаев подходит деление отклонений на сильное, умеренное и слабое. Сильное и умеренное отклонение означает высокую вероятность возврата к среднему, то есть вероятность закрыть сделку в прибыль.
<figure
  class="si-themed-screenshot"
  data-capture-height="193.5"
  data-capture-width="800"
  data-media-id="03-screenshot"
  data-media-kind="screenshot"
  data-refresh="auto"
  style="--si-screenshot-width: 800px"
>
  <div class="si-themed-screenshot__media">
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--dark"
      src="/help-assets/screenshots/tools/stat-screener/overview/03-screenshot-dark.webp"
      alt="Скринер арбитражных возможностей"
      width="1600"
      height="387"
      loading="lazy"
      decoding="async"
    />
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--light"
      src="/help-assets/screenshots/tools/stat-screener/overview/03-screenshot-light.webp"
      alt="Скринер арбитражных возможностей"
      width="1600"
      height="387"
      loading="lazy"
      decoding="async"
    />
    <svg
      class="si-media-annotation"
      viewBox="0 0 800 193.5"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="si-arrow-03-screenshot" markerWidth="16" markerHeight="16" refX="13" refY="7" orient="auto" markerUnits="userSpaceOnUse">
          <path class="si-media-annotation__arrowhead" d="M 0 0 L 14 7 L 0 14 L 3.5 7 z" />
        </marker>
      </defs>
      <rect class="si-media-annotation__halo" x="363.5" y="70.8" width="136.8" height="118.8" rx="6" />
      <rect class="si-media-annotation__shape si-media-annotation__rect" x="363.5" y="70.8" width="136.8" height="118.8" rx="6" />
    </svg>
  </div>
</figure>
Размер прибыли на сделке можно оценить через показатель потенциала прибыли и значение чистой прибыли для указанного размера позиции.

**Потенциал прибыли** показывает, сколько % от капитала можно заработать, если соотношение цен вернется к своему среднему значению без учета комиссии. Это оценка сверху потенциала сделки и способ быстро отфильтровать недостаточно прибыльные возможности. В реальности стоит рассчитывать на половину от этого значения в качестве прибыли. Если показатель вас не устраивает, стоит найти другую пару.
<figure
  class="si-themed-screenshot"
  data-capture-height="198.5"
  data-capture-width="800"
  data-media-id="04-screenshot"
  data-media-kind="screenshot"
  data-refresh="auto"
  style="--si-screenshot-width: 800px"
>
  <div class="si-themed-screenshot__media">
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--dark"
      src="/help-assets/screenshots/tools/stat-screener/overview/04-screenshot-dark.webp"
      alt="Скринер арбитражных возможностей"
      width="1600"
      height="397"
      loading="lazy"
      decoding="async"
    />
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--light"
      src="/help-assets/screenshots/tools/stat-screener/overview/04-screenshot-light.webp"
      alt="Скринер арбитражных возможностей"
      width="1600"
      height="397"
      loading="lazy"
      decoding="async"
    />
    <svg
      class="si-media-annotation"
      viewBox="0 0 800 198.5"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="si-arrow-04-screenshot" markerWidth="16" markerHeight="16" refX="13" refY="7" orient="auto" markerUnits="userSpaceOnUse">
          <path class="si-media-annotation__arrowhead" d="M 0 0 L 14 7 L 0 14 L 3.5 7 z" />
        </marker>
      </defs>
      <rect class="si-media-annotation__halo" x="225" y="74.3" width="92.5" height="115.4" rx="6" />
      <rect class="si-media-annotation__shape si-media-annotation__rect" x="225" y="74.3" width="92.5" height="115.4" rx="6" />
    </svg>
  </div>
</figure>
**Размер капитала и чистая прибыль** позволяет оценить влияние комиссий на сделку. Если мы используем акции, то комиссии могут «съесть» всю прибыль от арбитражной сделки. Увеличивая капитал, можно увеличить доходность сделки. Алгоритм подбирает минимальный размер капитала, который обеспечивает положительный результат сделки с учетом комиссий. Если вас в целом устраивает такой размер капитала, и вы считаете потенциал прибыли неплохим, можете поиграть с парой в бэктестере для поиска оптимального размера капитала.
<figure
  class="si-themed-screenshot"
  data-capture-height="192"
  data-capture-width="800"
  data-media-id="05-screenshot"
  data-media-kind="screenshot"
  data-refresh="auto"
  style="--si-screenshot-width: 800px"
>
  <div class="si-themed-screenshot__media">
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--dark"
      src="/help-assets/screenshots/tools/stat-screener/overview/05-screenshot-dark.webp"
      alt="Скринер арбитражных возможностей"
      width="1600"
      height="384"
      loading="lazy"
      decoding="async"
    />
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--light"
      src="/help-assets/screenshots/tools/stat-screener/overview/05-screenshot-light.webp"
      alt="Скринер арбитражных возможностей"
      width="1600"
      height="384"
      loading="lazy"
      decoding="async"
    />
    <svg
      class="si-media-annotation"
      viewBox="0 0 800 192"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="si-arrow-05-screenshot" markerWidth="16" markerHeight="16" refX="13" refY="7" orient="auto" markerUnits="userSpaceOnUse">
          <path class="si-media-annotation__arrowhead" d="M 0 0 L 14 7 L 0 14 L 3.5 7 z" />
        </marker>
      </defs>
      <rect class="si-media-annotation__halo" x="506.4" y="75.6" width="194.8" height="101.7" rx="6" />
      <rect class="si-media-annotation__shape si-media-annotation__rect" x="506.4" y="75.6" width="194.8" height="101.7" rx="6" />
    </svg>
  </div>
</figure>
[Подробнее про использование скринера](/tools/stat-screener/screener/)

Если пара инструментов обладает достаточной силой связи, имеет значимое отклонение от среднего соотношения цен, приемлемый размер капитала и привлекательный потенциал прибыли — оцените вероятность закрыть сделку в прибыль с помощью бэктестера.

## Бэктестер арбитражной пары

Бэктестер позволяет оценить на исторических данных вероятность закрыть сделку в прибыль при входе на текущем отклонении.

При клике на пару в скринере происходит переход на бэктестер с запуском теста на котировках за последний год с входом по текущему отклонению и выходу на уровне, немного не доходящем до среднего значения соотношения цен. Результаты теста отображаются в нижней части страницы в виде сводных данных и графика распределения сделок по результату.
<figure class="si-themed-screenshot">
  <img
    class="si-themed-screenshot__image si-themed-screenshot__image--dark"
    src="/help-assets/screenshots/tools/stat-screener/overview/06-screenshot-dark.webp"
    alt="Бэктестер арбитражной пары"
    width="1600"
    height="974"
    loading="lazy"
    decoding="async"
  />
  <img
    class="si-themed-screenshot__image si-themed-screenshot__image--light"
    src="/help-assets/screenshots/tools/stat-screener/overview/06-screenshot-light.webp"
    alt="Бэктестер арбитражной пары"
    width="1600"
    height="974"
    loading="lazy"
    decoding="async"
  />
</figure>
По доле прибыльных сделок можно оценить шансы закрыть сделку в прибыль. Средняя прибыльная сделка покажет, сколько при этом можно заработать. Матожидание подсказывает, как соотносится размер ожидаемой прибыли с риском получить убыток.

После первой оценки арбитражной сделки вы можете перейти к более тонкому анализу, меняя параметры сигнала, уровни фиксации прибыли и убытка, размер капитала и величину проскальзывания. Можно менять период тестирования — в некоторых случаях более релевантные тесты будут за последние 3-6 месяцев.

Также полезно визуально оценить график спреда. При определенной насмотренности по паттерну на графике можно оценить шансы возврата к среднему из текущей точки. На скриншоте ниже вы можете видеть пример отклонения, которое начало возвращаться к среднему значению.
<figure
  class="si-themed-screenshot"
  data-capture-height="614"
  data-capture-width="749"
  data-media-id="07-screenshot"
  data-media-kind="illustration"
  data-refresh="manual"
  style="--si-screenshot-width: 749px"
>
  <div class="si-themed-screenshot__media">
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--dark"
      src="/help-assets/screenshots/tools/stat-screener/overview/07-screenshot-dark.webp"
      alt="Бэктестер арбитражной пары"
      width="1498"
      height="1228"
      loading="lazy"
      decoding="async"
    />
    <img
      class="si-themed-screenshot__image si-themed-screenshot__image--light"
      src="/help-assets/screenshots/tools/stat-screener/overview/07-screenshot-light.webp"
      alt="Бэктестер арбитражной пары"
      width="1498"
      height="1228"
      loading="lazy"
      decoding="async"
    />
    <svg
      class="si-media-annotation"
      viewBox="0 0 749 614"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="si-arrow-07-screenshot" markerWidth="16" markerHeight="16" refX="13" refY="7" orient="auto" markerUnits="userSpaceOnUse">
          <path class="si-media-annotation__arrowhead" d="M 0 0 L 14 7 L 0 14 L 3.5 7 z" />
        </marker>
      </defs>
      <line class="si-media-annotation__halo" x1="572.1" y1="363.7" x2="595.7" y2="299.5" />
      <line class="si-media-annotation__shape si-media-annotation__arrow" x1="572.1" y1="363.7" x2="595.7" y2="299.5" marker-end="url(#si-arrow-07-screenshot)" />
    </svg>
  </div>
</figure>
Если же отклонение находится в процессе развития и нет признаков, что оно начало возвращаться к среднему, лучше подождать, когда движение спреда остановится и наметится обратное движение.

[Подробнее про использование бэктестера](/tools/stat-screener/backtester/)

## Совершение арбитражной сделки

Для профессионального трейдера информации из скринера и бэктестера достаточно для принятия решения и проведения арбитражной сделки. Если у вас мало опыта, то рекомендуем начать с виртуальной торговли, а также записывать в excel или даже на бумагу сделки и оценивать их результат.

[Как создать и провести арбитражную сделку](/strategies/stat-arbitrage/price-divergence/)

## Читать далее

- [Скринер арбитражных возможностей](/tools/stat-screener/screener/)
- [Как оценить доходность арбитражной сделки с помощью бэктестера](/tools/stat-screener/backtester/)
