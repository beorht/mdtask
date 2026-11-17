// Тема 3 «Цветовой круг и гармония» — шаблон «Минимал-страница». Цветные блоки должны СОЧЕТАТЬСЯ: образовывать
// схему на цветовом круге. Правила: harmony (scheme: any|analogous|complementary) + contrast для читаемости.
module.exports = [
  {
    id: 'harm-pair',
    title: 'Сочетающиеся цвета',
    template: 'hero-minimal',
    prompt:
      'Раскрасьте «солнце» и кнопку так, чтобы их цвета сочетались (были рядом на цветовом круге или ' +
      'напротив друг друга), а заголовок читался на фоне. Задайте фон, заголовок, цвет «солнца» и кнопки.',
    roles: [
      { key: 'pageBg', selector: '.hero', prop: 'background', label: 'Фон страницы' },
      { key: 'title', selector: '.hero__title', prop: 'color', label: 'Заголовок' },
      { key: 'sun', selector: '.hero__sun', prop: 'background', label: 'Солнце' },
      { key: 'btn', selector: '.hero__btn', prop: 'background', label: 'Кнопка' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'harmony', roles: ['sun', 'btn'], scheme: 'any' },
    ],
    sample: { pageBg: '#f2eee8', title: '#2a2a2e', sun: '#ff5a4d', btn: '#ff8a3d' },
  },
  {
    id: 'harm-analogous',
    title: 'Аналоговая схема',
    template: 'hero-minimal',
    prompt:
      'Соберите аналоговую схему — три соседних оттенка на круге (например тёплые: красный, оранжевый, ' +
      'жёлтый). Раскрасьте «солнце», панель и кнопку соседними цветами; заголовок оставьте читаемым.',
    roles: [
      { key: 'pageBg', selector: '.hero', prop: 'background', label: 'Фон страницы' },
      { key: 'title', selector: '.hero__title', prop: 'color', label: 'Заголовок' },
      { key: 'sun', selector: '.hero__sun', prop: 'background', label: 'Солнце' },
      { key: 'panelBg', selector: '.hero__panel', prop: 'background', label: 'Панель' },
      { key: 'btn', selector: '.hero__btn', prop: 'background', label: 'Кнопка' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'harmony', roles: ['sun', 'panelBg', 'btn'], scheme: 'analogous' },
    ],
    sample: { pageBg: '#f4f0ea', title: '#2a2a2e', sun: '#e24d3c', panelBg: '#e8963f', btn: '#d23f6a' },
  },
  {
    id: 'harm-complementary',
    title: 'Комплементарная пара',
    template: 'hero-minimal',
    prompt:
      'Возьмите два противоположных цвета круга (комплементарную пару, например синий и оранжевый) для ' +
      '«солнца» и кнопки — это даёт сильный контраст. Заголовок должен читаться на фоне.',
    roles: [
      { key: 'pageBg', selector: '.hero', prop: 'background', label: 'Фон страницы' },
      { key: 'title', selector: '.hero__title', prop: 'color', label: 'Заголовок' },
      { key: 'sun', selector: '.hero__sun', prop: 'background', label: 'Солнце' },
      { key: 'btn', selector: '.hero__btn', prop: 'background', label: 'Кнопка' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'harmony', roles: ['sun', 'btn'], scheme: 'complementary' },
    ],
    sample: { pageBg: '#eef1f4', title: '#24262b', sun: '#2b8cc4', btn: '#d4762e' },
  },
  {
    id: 'harm-mono',
    title: 'Монохромная схема',
    template: 'hero-minimal',
    prompt: 'Соберите монохромную палитру — один тон в разной светлоте. Раскрасьте «солнце», панель и кнопку оттенками одного цвета (например синего: светлее и темнее). Заголовок оставьте читаемым.',
    roles: [
      { key: 'pageBg', selector: '.hero', prop: 'background', label: 'Фон страницы' },
      { key: 'title', selector: '.hero__title', prop: 'color', label: 'Заголовок' },
      { key: 'sun', selector: '.hero__sun', prop: 'background', label: 'Солнце' },
      { key: 'panelBg', selector: '.hero__panel', prop: 'background', label: 'Панель' },
      { key: 'btn', selector: '.hero__btn', prop: 'background', label: 'Кнопка' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'harmony', roles: ['sun', 'panelBg', 'btn'], scheme: 'mono' },
    ],
    sample: { pageBg: '#eef1f4', title: '#24262b', sun: '#2b6cb0', panelBg: '#7fb0d8', btn: '#1d5f8a' },
  },
  {
    id: 'harm-cool-analog',
    title: 'Холодная аналоговая',
    template: 'hero-minimal',
    prompt: 'Соберите холодную аналоговую пару — соседние холодные оттенки (например синий и сине-зелёный) для «солнца» и кнопки. Заголовок должен читаться.',
    roles: [
      { key: 'pageBg', selector: '.hero', prop: 'background', label: 'Фон страницы' },
      { key: 'title', selector: '.hero__title', prop: 'color', label: 'Заголовок' },
      { key: 'sun', selector: '.hero__sun', prop: 'background', label: 'Солнце' },
      { key: 'btn', selector: '.hero__btn', prop: 'background', label: 'Кнопка' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'harmony', roles: ['sun', 'btn'], scheme: 'analogous' },
    ],
    sample: { pageBg: '#eef1f4', title: '#24262b', sun: '#2b6cb0', btn: '#2e7d5b' },
  },
  {
    id: 'harm-triad',
    title: 'Триада',
    template: 'hero-minimal',
    prompt: 'Соберите триаду — три оттенка на равном расстоянии по кругу (например красный, зелёный, сине-фиолетовый). Раскрасьте «солнце», панель и кнопку. Заголовок — читаемый.',
    roles: [
      { key: 'pageBg', selector: '.hero', prop: 'background', label: 'Фон страницы' },
      { key: 'title', selector: '.hero__title', prop: 'color', label: 'Заголовок' },
      { key: 'sun', selector: '.hero__sun', prop: 'background', label: 'Солнце' },
      { key: 'panelBg', selector: '.hero__panel', prop: 'background', label: 'Панель' },
      { key: 'btn', selector: '.hero__btn', prop: 'background', label: 'Кнопка' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'harmony', roles: ['sun', 'panelBg', 'btn'], scheme: 'triadic' },
    ],
    sample: { pageBg: '#eef1f4', title: '#24262b', sun: '#c0392b', panelBg: '#2f9e52', btn: '#5b4bc2' },
  },
  {
    id: 'harm-panels',
    title: 'Читаемые панели',
    template: 'hero-minimal',
    prompt: 'Раскрасьте «солнце» и панели соседними оттенками (аналоговая схема), но так, чтобы подписи на панелях читались. Заголовок — на фоне, тоже читаемый.',
    roles: [
      { key: 'pageBg', selector: '.hero', prop: 'background', label: 'Фон страницы' },
      { key: 'title', selector: '.hero__title', prop: 'color', label: 'Заголовок' },
      { key: 'sun', selector: '.hero__sun', prop: 'background', label: 'Солнце' },
      { key: 'panelBg', selector: '.hero__panel', prop: 'background', label: 'Панель' },
      { key: 'panelLabel', selector: '.hero__panel-label', prop: 'color', label: 'Подпись панели' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'harmony', roles: ['sun', 'panelBg'], scheme: 'analogous' },
      { type: 'contrast', fg: 'panelLabel', bg: 'panelBg', min: 4.5 },
    ],
    sample: { pageBg: '#f4f0ea', title: '#241f1b', sun: '#c0392b', panelBg: '#9d174d', panelLabel: '#ffffff' },
  },
  {
    id: 'harm-btntext',
    title: 'Комплементарная с читаемой кнопкой',
    template: 'hero-minimal',
    prompt: 'Возьмите комплементарную пару (синий и оранжевый) для «солнца» и кнопки, но надпись на кнопке должна читаться. Заголовок — на фоне.',
    roles: [
      { key: 'pageBg', selector: '.hero', prop: 'background', label: 'Фон страницы' },
      { key: 'title', selector: '.hero__title', prop: 'color', label: 'Заголовок' },
      { key: 'sun', selector: '.hero__sun', prop: 'background', label: 'Солнце' },
      { key: 'btn', selector: '.hero__btn', prop: 'background', label: 'Кнопка' },
      { key: 'btnText', selector: '.hero__btn', prop: 'color', label: 'Текст кнопки' },
    ],
    rules: [
      { type: 'contrast', fg: 'title', bg: 'pageBg', min: 4.5 },
      { type: 'contrast', fg: 'btnText', bg: 'btn', min: 4.5 },
      { type: 'harmony', roles: ['sun', 'btn'], scheme: 'complementary' },
    ],
    sample: { pageBg: '#eef1f4', title: '#24262b', sun: '#2f6f9e', btn: '#c6502a', btnText: '#ffffff' },
  },
];
