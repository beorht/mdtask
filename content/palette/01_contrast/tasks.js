// Тема 1 «Контраст и читаемость» — предмет «Цвет и палитра». Шаблон «Карточка товара».
// Студент пишет CSS к готовым классам (без переменных), подбирая цвет color-picker'ом. Проверка — по
// правилам теории цвета на ВЫЧИСЛЕННЫХ цветах (src/lib/palette-course/validate.js + public/js/color-engine.js):
// контраст по WCAG, заметность акцента, различимость. Любая палитра, прошедшая правила, засчитывается.
// roles: { key, selector, prop: background|color|border, label }. sample — эталонная рабочая палитра (для
// чекера и показа примера в админке; студенту не видна).
module.exports = [
  {
    id: 'card-read',
    title: 'Читаемый заголовок и текст',
    template: 'product-card',
    prompt:
      'Сделайте карточку светлой, а текст — тёмным, чтобы заголовок и описание легко читались. ' +
      'Задайте фон карточки, цвет заголовка и цвет описания.',
    roles: [
      { key: 'cardBg', selector: '.product-card', prop: 'background', label: 'Фон карточки' },
      { key: 'title', selector: '.product-card__title', prop: 'color', label: 'Заголовок' },
      { key: 'desc', selector: '.product-card__desc', prop: 'color', label: 'Описание' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'desc', bg: 'cardBg', min: 4.5 },
    ],
    sample: { cardBg: '#ffffff', title: '#2a2a2e', desc: '#4e4e54' },
  },
  {
    id: 'card-button',
    title: 'Кнопка, которую видно',
    template: 'product-card',
    prompt:
      'Кнопка «В корзину» должна выделяться на карточке и иметь читаемую надпись. ' +
      'Задайте фон карточки, фон кнопки и цвет текста кнопки.',
    roles: [
      { key: 'cardBg', selector: '.product-card', prop: 'background', label: 'Фон карточки' },
      { key: 'btnBg', selector: '.product-card__btn', prop: 'background', label: 'Фон кнопки' },
      { key: 'btnText', selector: '.product-card__btn', prop: 'color', label: 'Текст кнопки' },
    ],
    rules: [
      { type: 'contrast', fg: 'btnText', bg: 'btnBg', min: 4.5 },
      { type: 'accent', accent: 'btnBg', bg: 'cardBg', minContrast: 2.2 },
    ],
    sample: { cardBg: '#ffffff', btnBg: '#b5471f', btnText: '#ffffff' },
  },
  {
    id: 'card-badge',
    title: 'Бейдж на картинке',
    template: 'product-card',
    prompt:
      'Плашка «Хит продаж» лежит поверх фото. Подберите ей фон и цвет текста так, чтобы надпись читалась. ' +
      'Задайте фон бейджа и цвет его текста.',
    roles: [
      { key: 'badgeBg', selector: '.product-card__badge', prop: 'background', label: 'Фон бейджа' },
      { key: 'badgeText', selector: '.product-card__badge', prop: 'color', label: 'Текст бейджа' },
    ],
    rules: [
      { type: 'contrast', fg: 'badgeText', bg: 'badgeBg', min: 4.5 },
    ],
    sample: { badgeBg: '#1f6f4a', badgeText: '#ffffff' },
  },
  {
    id: 'card-full',
    title: 'Весь ценник читается',
    template: 'product-card',
    prompt:
      'Доведите карточку до конца: светлый фон, тёмный заголовок и описание, заметная категория, ' +
      'читаемая цена и кнопка с контрастной надписью.',
    roles: [
      { key: 'cardBg', selector: '.product-card', prop: 'background', label: 'Фон карточки' },
      { key: 'cat', selector: '.product-card__cat', prop: 'color', label: 'Категория' },
      { key: 'title', selector: '.product-card__title', prop: 'color', label: 'Заголовок' },
      { key: 'desc', selector: '.product-card__desc', prop: 'color', label: 'Описание' },
      { key: 'price', selector: '.product-card__price', prop: 'color', label: 'Цена' },
      { key: 'btnBg', selector: '.product-card__btn', prop: 'background', label: 'Фон кнопки' },
      { key: 'btnText', selector: '.product-card__btn', prop: 'color', label: 'Текст кнопки' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'desc', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'price', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'cat', bg: 'cardBg', min: 3 },
      { type: 'contrast', fg: 'btnText', bg: 'btnBg', min: 4.5 },
      { type: 'accent', accent: 'btnBg', bg: 'cardBg', minContrast: 2.2 },
    ],
    sample: { cardBg: '#fffaf6', cat: '#8a5a44', title: '#2a2a2e', desc: '#55555b', price: '#9a3412', btnBg: '#b5471f', btnText: '#ffffff' },
  },
  {
    id: 'card-dark',
    title: 'Тёмная карточка',
    template: 'product-card',
    prompt: 'Сделайте карточку тёмной, а текст — светлым, чтобы заголовок и описание читались на тёмном фоне. Задайте фон карточки, цвет заголовка и описания.',
    roles: [
      { key: 'cardBg', selector: '.product-card', prop: 'background', label: 'Фон карточки' },
      { key: 'title', selector: '.product-card__title', prop: 'color', label: 'Заголовок' },
      { key: 'desc', selector: '.product-card__desc', prop: 'color', label: 'Описание' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'desc', bg: 'cardBg', min: 4.5 },
    ],
    sample: { cardBg: '#241f1b', title: '#f5f1ea', desc: '#cfc7bd' },
  },
  {
    id: 'card-cta-green',
    title: 'Зелёная кнопка',
    template: 'product-card',
    prompt: 'Сделайте светлую карточку, читаемую цену и зелёную кнопку с читаемой надписью, которая выделяется на карточке. Задайте фон карточки, цену, фон и текст кнопки.',
    roles: [
      { key: 'cardBg', selector: '.product-card', prop: 'background', label: 'Фон карточки' },
      { key: 'price', selector: '.product-card__price', prop: 'color', label: 'Цена' },
      { key: 'btnBg', selector: '.product-card__btn', prop: 'background', label: 'Фон кнопки' },
      { key: 'btnText', selector: '.product-card__btn', prop: 'color', label: 'Текст кнопки' },
    ],
    rules: [
      { type: 'contrast', fg: 'price', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'btnText', bg: 'btnBg', min: 4.5 },
      { type: 'accent', accent: 'btnBg', bg: 'cardBg', minContrast: 2.5 },
    ],
    sample: { cardBg: '#ffffff', price: '#1f6f4a', btnBg: '#1f6f4a', btnText: '#ffffff' },
  },
  {
    id: 'card-soft',
    title: 'Мягкая кремовая карточка',
    template: 'product-card',
    prompt: 'Тёплый кремовый фон, тёмный заголовок и описание, спокойная категория сверху. Задайте фон карточки, категорию, заголовок и описание.',
    roles: [
      { key: 'cardBg', selector: '.product-card', prop: 'background', label: 'Фон карточки' },
      { key: 'cat', selector: '.product-card__cat', prop: 'color', label: 'Категория' },
      { key: 'title', selector: '.product-card__title', prop: 'color', label: 'Заголовок' },
      { key: 'desc', selector: '.product-card__desc', prop: 'color', label: 'Описание' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'desc', bg: 'cardBg', min: 4.5 },
      { type: 'contrast', fg: 'cat', bg: 'cardBg', min: 3 },
    ],
    sample: { cardBg: '#fdf6ec', cat: '#8a5a44', title: '#241f1b', desc: '#53493f' },
  },
  {
    id: 'card-badge-berry',
    title: 'Ягодный бейдж',
    template: 'product-card',
    prompt: 'Дайте плашке «Хит продаж» насыщенный фон и светлый текст, чтобы надпись читалась поверх фото. Задайте фон бейджа и цвет его текста.',
    roles: [
      { key: 'badgeBg', selector: '.product-card__badge', prop: 'background', label: 'Фон бейджа' },
      { key: 'badgeText', selector: '.product-card__badge', prop: 'color', label: 'Текст бейджа' },
    ],
    rules: [
      { type: 'contrast', fg: 'badgeText', bg: 'badgeBg', min: 4.5 },
    ],
    sample: { badgeBg: '#8a2342', badgeText: '#ffffff' },
  },
];
