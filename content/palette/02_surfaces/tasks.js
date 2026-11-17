// Тема 2 «Поверхности и глубина» — шаблон «Витрина карточек». Карточка должна отделяться от фона страницы,
// а текст на ней — читаться. Правила: distinct (различимость поверхности и фона) + contrast (читаемость).
module.exports = [
  {
    id: 'surf-cards',
    title: 'Карточки видно на фоне',
    template: 'card-grid',
    prompt:
      'Сейчас карточки сливаются с фоном страницы. Сделайте фон страницы и фон карточки разными, ' +
      'а название товара — читаемым. Задайте фон страницы, фон карточки и цвет названия.',
    roles: [
      { key: 'pageBg', selector: 'body', prop: 'background', label: 'Фон страницы' },
      { key: 'cardBg', selector: '.card', prop: 'background', label: 'Фон карточки' },
      { key: 'cardName', selector: '.card__name', prop: 'color', label: 'Название товара' },
    ],
    rules: [
      { type: 'distinct', a: 'cardBg', b: 'pageBg', minDeltaE: 6 },
      { type: 'contrast', fg: 'cardName', bg: 'cardBg', min: 4.5 },
    ],
    sample: { pageBg: '#eceef4', cardBg: '#ffffff', cardName: '#2a2a2e' },
  },
  {
    id: 'surf-text',
    title: 'Заголовок и цены',
    template: 'card-grid',
    prompt:
      'Доведите витрину: карточка отделяется от фона, заголовок раздела и цена читаются. ' +
      'Задайте фон страницы, фон карточки, цвет заголовка, названия и цены.',
    roles: [
      { key: 'pageBg', selector: 'body', prop: 'background', label: 'Фон страницы' },
      { key: 'cardBg', selector: '.card', prop: 'background', label: 'Фон карточки' },
      { key: 'title', selector: '.catalog__title', prop: 'color', label: 'Заголовок раздела' },
      { key: 'cardName', selector: '.card__name', prop: 'color', label: 'Название товара' },
      { key: 'price', selector: '.card__price', prop: 'color', label: 'Цена' },
    ],
    rules: [
      { type: 'distinct', a: 'cardBg', b: 'pageBg', minDeltaE: 6 },
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'contrast', fg: 'cardName', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'price', bg: 'cardBg', min: 4.5 },
    ],
    sample: { pageBg: '#eceef4', cardBg: '#ffffff', title: '#26262b', cardName: '#2a2a2e', price: '#9a3412' },
  },
  {
    id: 'surf-dark',
    title: 'Глубина на тёмном фоне',
    template: 'card-grid',
    prompt:
      'Сделайте наоборот — тёмный фон страницы и светлые карточки. Заголовок на тёмном фоне и текст ' +
      'на светлой карточке должны читаться. Задайте фон страницы, фон карточки, заголовок, название и цену.',
    roles: [
      { key: 'pageBg', selector: 'body', prop: 'background', label: 'Фон страницы' },
      { key: 'cardBg', selector: '.card', prop: 'background', label: 'Фон карточки' },
      { key: 'title', selector: '.catalog__title', prop: 'color', label: 'Заголовок раздела' },
      { key: 'cardName', selector: '.card__name', prop: 'color', label: 'Название товара' },
      { key: 'price', selector: '.card__price', prop: 'color', label: 'Цена' },
    ],
    rules: [
      { type: 'distinct', a: 'cardBg', b: 'pageBg', minDeltaE: 20 },
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'contrast', fg: 'cardName', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'price', bg: 'cardBg', min: 4.5 },
    ],
    sample: { pageBg: '#2a2730', cardBg: '#ffffff', title: '#f3f0ea', cardName: '#2a2a2e', price: '#9a3412' },
  },
  {
    id: 'surf-tag',
    title: 'Ярлык на карточке',
    template: 'card-grid',
    prompt: 'Карточки отделите от фона, а ярлык («Новое», «Хит») сделайте заметным и с читаемой надписью. Задайте фон страницы, фон карточки, название, фон ярлыка и его текст.',
    roles: [
      { key: 'pageBg', selector: 'body', prop: 'background', label: 'Фон страницы' },
      { key: 'cardBg', selector: '.card', prop: 'background', label: 'Фон карточки' },
      { key: 'cardName', selector: '.card__name', prop: 'color', label: 'Название' },
      { key: 'tagBg', selector: '.card__tag', prop: 'background', label: 'Фон ярлыка' },
      { key: 'tagText', selector: '.card__tag', prop: 'color', label: 'Текст ярлыка' },
    ],
    rules: [
      { type: 'distinct', a: 'cardBg', b: 'pageBg', minDeltaE: 6 },
      { type: 'contrast', fg: 'cardName', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'tagText', bg: 'tagBg', min: 4.5 },
    ],
    sample: { pageBg: '#eceef4', cardBg: '#ffffff', cardName: '#241f1b', tagBg: '#1f6f4a', tagText: '#ffffff' },
  },
  {
    id: 'surf-warm',
    title: 'Тёплый фон витрины',
    template: 'card-grid',
    prompt: 'Сделайте тёплый фон страницы и белые карточки, которые на нём «всплывают»; заголовок и названия читаются. Задайте фон страницы, фон карточки, заголовок раздела и название товара.',
    roles: [
      { key: 'pageBg', selector: 'body', prop: 'background', label: 'Фон страницы' },
      { key: 'cardBg', selector: '.card', prop: 'background', label: 'Фон карточки' },
      { key: 'title', selector: '.catalog__title', prop: 'color', label: 'Заголовок раздела' },
      { key: 'cardName', selector: '.card__name', prop: 'color', label: 'Название' },
    ],
    rules: [
      { type: 'distinct', a: 'cardBg', b: 'pageBg', minDeltaE: 6 },
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'contrast', fg: 'cardName', bg: 'cardBg', min: 4.5 },
    ],
    sample: { pageBg: '#f4ece2', cardBg: '#ffffff', title: '#241f1b', cardName: '#241f1b' },
  },
  {
    id: 'surf-cool',
    title: 'Холодный фон витрины',
    template: 'card-grid',
    prompt: 'Теперь прохладный фон страницы и белые карточки; заголовок и названия должны читаться. Задайте фон страницы, фон карточки, заголовок раздела и название.',
    roles: [
      { key: 'pageBg', selector: 'body', prop: 'background', label: 'Фон страницы' },
      { key: 'cardBg', selector: '.card', prop: 'background', label: 'Фон карточки' },
      { key: 'title', selector: '.catalog__title', prop: 'color', label: 'Заголовок раздела' },
      { key: 'cardName', selector: '.card__name', prop: 'color', label: 'Название' },
    ],
    rules: [
      { type: 'distinct', a: 'cardBg', b: 'pageBg', minDeltaE: 6 },
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'contrast', fg: 'cardName', bg: 'cardBg', min: 4.5 },
    ],
    sample: { pageBg: '#e4eaf0', cardBg: '#ffffff', title: '#1f2a33', cardName: '#1f2a33' },
  },
  {
    id: 'surf-tinted-card',
    title: 'Цветные карточки на белом',
    template: 'card-grid',
    prompt: 'Сделайте наоборот: белый фон страницы и слегка тонированные карточки, которые на нём заметны. Текст и цена читаются. Задайте фон страницы, фон карточки, название и цену.',
    roles: [
      { key: 'pageBg', selector: 'body', prop: 'background', label: 'Фон страницы' },
      { key: 'cardBg', selector: '.card', prop: 'background', label: 'Фон карточки' },
      { key: 'cardName', selector: '.card__name', prop: 'color', label: 'Название' },
      { key: 'price', selector: '.card__price', prop: 'color', label: 'Цена' },
    ],
    rules: [
      { type: 'distinct', a: 'cardBg', b: 'pageBg', minDeltaE: 6 },
      { type: 'contrast', fg: 'cardName', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'price', bg: 'cardBg', min: 4.5 },
    ],
    sample: { pageBg: '#ffffff', cardBg: '#eceef4', cardName: '#241f1b', price: '#9a3412' },
  },
  {
    id: 'surf-price-accent',
    title: 'Акцентная цена',
    template: 'card-grid',
    prompt: 'Карточка отделяется от фона, название читается, а цена выделена акцентным цветом, но всё ещё читаема. Задайте фон страницы, фон карточки, название и цену.',
    roles: [
      { key: 'pageBg', selector: 'body', prop: 'background', label: 'Фон страницы' },
      { key: 'cardBg', selector: '.card', prop: 'background', label: 'Фон карточки' },
      { key: 'cardName', selector: '.card__name', prop: 'color', label: 'Название' },
      { key: 'price', selector: '.card__price', prop: 'color', label: 'Цена' },
    ],
    rules: [
      { type: 'distinct', a: 'cardBg', b: 'pageBg', minDeltaE: 6 },
      { type: 'contrast', fg: 'cardName', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'price', bg: 'cardBg', min: 4.5 },
    ],
    sample: { pageBg: '#eceef4', cardBg: '#ffffff', cardName: '#241f1b', price: '#b5471f' },
  },
];
