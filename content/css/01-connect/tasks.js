// Тема 1. Как CSS подключается к странице. Разметка готова, студент пишет только CSS (см. src/lib/css-course).
const CARD = `
<h1>Кафе «Ромашка»</h1>
<p>Свежая выпечка и ароматный кофе каждый день.</p>
<p>Мы находимся в центре города, рядом с парком.</p>
<a href="#menu">Посмотреть меню</a>`;

module.exports = [
  {
    id: 'connect-01', title: 'Цвет заголовка',
    description: 'Сделайте текст заголовка h1 цветом #CA2851.',
    html: CARD,
    css: 'h1 { color: #CA2851; }',
  },
  {
    id: 'connect-02', title: 'Фон страницы',
    description: 'Задайте всей странице (body) цвет фона #FFF8EE.',
    html: CARD,
    css: 'body { background-color: #FFF8EE; }',
  },
  {
    id: 'connect-03', title: 'Два свойства в одном правиле',
    description: 'Абзацы — цветом #555555 и размером шрифта 18px.',
    html: CARD,
    css: 'p { color: #555555; font-size: 18px; }',
  },
  {
    id: 'connect-04', title: 'Два правила',
    description: 'Заголовок h1 — цветом #2F5FA7, ссылка — цветом #2E7D4F.',
    html: CARD,
    css: 'h1 { color: #2F5FA7; }\na { color: #2E7D4F; }',
  },
  {
    id: 'connect-05', title: 'Заголовок по центру',
    description: 'Выровняйте заголовок h1 по центру (text-align) и сделайте его размером 40px.',
    html: CARD,
    css: 'h1 { text-align: center; font-size: 40px; }',
  },
  {
    id: 'connect-06', title: 'Без отступов страницы',
    description: 'У body по умолчанию есть внешний отступ 8px. Уберите его (margin: 0) и задайте фон #F1EBE2.',
    html: CARD,
    css: 'body { margin: 0; background-color: #F1EBE2; }',
  },
  {
    id: 'connect-07', title: 'Цвет текста всей страницы',
    description: 'Задайте body цвет текста #3B3835 — абзацы его унаследуют. Заголовок h1 сделайте цветом #B88A5A.',
    html: CARD,
    css: 'body { color: #3B3835; }\nh1 { color: #B88A5A; }',
  },
  {
    id: 'connect-08', title: 'Пункты списка',
    description: 'Пункты списка (li) — цветом #CA2851 и размером 20px, заголовок h2 — размером 28px.',
    html: `
<h2>Сегодня в меню</h2>
<ul>
  <li>Капучино</li>
  <li>Круассан</li>
  <li>Чизкейк</li>
</ul>`,
    css: 'li { color: #CA2851; font-size: 20px; }\nh2 { font-size: 28px; }',
  },
  {
    id: 'connect-09', title: 'Ссылка без подчёркивания',
    description: 'Уберите у ссылки подчёркивание (text-decoration: none) и сделайте её цветом #FF6766 и размером 18px.',
    html: CARD,
    css: 'a { text-decoration: none; color: #FF6766; font-size: 18px; }',
  },
  {
    id: 'connect-10', title: 'Визитка кафе',
    description: 'Соберите всё вместе: у body — фон #1C1A1B, цвет текста #FFE3B3 и margin 0; у h1 — цвет #FFB173 и выравнивание по центру; у абзацев — размер 18px; у ссылки — цвет #FF6766.',
    html: CARD,
    css: 'body { background-color: #1C1A1B; color: #FFE3B3; margin: 0; }\nh1 { color: #FFB173; text-align: center; }\np { font-size: 18px; }\na { color: #FF6766; }',
  },
];
