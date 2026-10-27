// Тема 15. Списки, ссылки, таблицы и формы.
const NAV = `<ul class="nav"><li><a class="current" href="#">Главная</a></li><li><a href="#">Меню</a></li><li><a href="#">Доставка</a></li><li><a href="#">Контакты</a></li></ul>`;
const TABLE = `<table class="price">
  <caption>Прайс-лист</caption>
  <thead><tr><th>Напиток</th><th>Объём</th><th>Цена, ₽</th></tr></thead>
  <tbody>
    <tr><td>Эспрессо</td><td>30 мл</td><td>150</td></tr>
    <tr><td>Капучино</td><td>250 мл</td><td>220</td></tr>
    <tr><td>Латте</td><td>300 мл</td><td>240</td></tr>
    <tr><td>Раф</td><td>300 мл</td><td>290</td></tr>
  </tbody>
</table>`;
const FORM = `<form class="login">
  <h2>Вход</h2>
  <label for="mail">Почта</label>
  <input id="mail" class="field" placeholder="you@mail.ru">
  <label for="pass">Пароль</label>
  <input id="pass" class="field" type="password">
  <button class="submit">Войти</button>
</form>`;

module.exports = [
  { id: 'ui-01', title: 'Меню из списка', description: 'Список .nav — без маркеров, без внешних и внутренних отступов, в ряд (flex) с промежутком 8px.', html: NAV, css: '.nav { list-style: none; margin: 0; padding: 0; display: flex; gap: 8px; }' },
  { id: 'ui-02', title: 'Ссылки меню', description: 'Список .nav — без маркеров и отступов, в ряд (flex), фон #1C1A1B; ссылки — блочные, отступ 10px 14px, цвет #FFE3B3, без подчёркивания.', html: NAV, css: '.nav { list-style: none; margin: 0; padding: 0; display: flex; background-color: #1C1A1B; }\n.nav a { display: block; padding: 10px 14px; color: #FFE3B3; text-decoration: none; }' },
  { id: 'ui-03', title: 'Текущий пункт и наведение', description: 'Ссылки меню — цвет #1F3F66, без подчёркивания, отступ 6px 10px; текущая (.current) и наведённая — фон #CA2851 и белый текст.', html: NAV, css: '.nav a { color: #1F3F66; text-decoration: none; padding: 6px 10px; }\n.nav a:hover, .nav .current { background-color: #CA2851; color: white; }', states: [{ selector: '.nav li:nth-child(2) a', state: 'hover' }], require: [':hover'] },
  { id: 'ui-04', title: 'Маркеры-квадраты', description: 'Список .nav — маркеры квадратами (list-style-type: square) внутри текста (list-style-position: inside), цвет #CA2851.', html: NAV, css: '.nav { list-style-type: square; list-style-position: inside; color: #CA2851; }' },
  { id: 'ui-05', title: 'Рамки таблицы', description: 'Таблица .price — слитые рамки (border-collapse: collapse); у th и td — рамка 1px solid #CCCCCC и отступ 8px 12px.', html: TABLE, css: '.price { border-collapse: collapse; }\n.price th, .price td { border: 1px solid #CCCCCC; padding: 8px 12px; }', require: ['border-collapse'] },
  { id: 'ui-06', title: 'Шапка и зебра', description: 'Таблица — ширина 100%, слитые рамки; th — фон #1C1A1B, цвет #FFE3B3, отступ 8px; td — отступ 8px; чётные строки tbody — фон #FFF3E6.', html: TABLE, css: '.price { width: 100%; border-collapse: collapse; }\n.price th { background-color: #1C1A1B; color: #FFE3B3; padding: 8px; }\n.price td { padding: 8px; }\n.price tbody tr:nth-child(even) { background-color: #FFF3E6; }' },
  { id: 'ui-07', title: 'Числа справа', description: 'Таблица — ширина 100%; все ячейки th и td выровнены влево, кроме последней колонки — её содержимое по правому краю; подпись caption — жирная и по левому краю.', html: TABLE, css: '.price { width: 100%; }\n.price th, .price td { text-align: left; }\n.price th:last-child, .price td:last-child { text-align: right; }\n.price caption { font-weight: bold; text-align: left; }' },
  { id: 'ui-08', title: 'Поля формы', description: 'Подписи — блочные, внешний отступ 12px 0 4px; поля .field — шрифт как у страницы (font: inherit), ширина 100% вместе с отступами (border-box), отступ 10px, рамка 1px solid #CCCCCC, скругление 8px. Ширина формы .login — 320px.', html: FORM, css: '.login { width: 320px; }\n.login label { display: block; margin: 12px 0 4px; }\n.field { font: inherit; width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #CCCCCC; border-radius: 8px; }' },
  { id: 'ui-09', title: 'Фокус и кнопка', description: 'Поле .field в фокусе — рамка 2px solid #CA2851 и без контура; кнопка .submit — шрифт как у страницы, отступ 10px 20px, без рамки, скругление 8px, фон #CA2851, белый текст; при наведении — фон #1C1A1B.', html: FORM, css: '.field:focus { border: 2px solid #CA2851; outline: none; }\n.submit { font: inherit; padding: 10px 20px; border: 0; border-radius: 8px; background-color: #CA2851; color: white; }\n.submit:hover { background-color: #1C1A1B; }', states: [{ selector: '#mail', state: 'focus' }, { selector: '.submit', state: 'hover' }], require: [':focus', ':hover'] },
  { id: 'ui-10', title: 'Форма входа целиком', description: 'Как в образце: .login — ширина 340px, отступ 24px, фон #FFF8EE, скругление 16px, тень 0 8px 24px rgba(0, 0, 0, 0.12), по центру (margin 40px auto); h2 — margin-top 0; подписи — блочные, жирные (600), отступ 12px 0 4px; поля — как в задании 8; кнопка — ширина 100%, отступ 12px, внешний отступ сверху 16px, без рамки, скругление 8px, фон #CA2851, белый текст, шрифт как у страницы.', html: FORM, css: '.login { width: 340px; padding: 24px; background-color: #FFF8EE; border-radius: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); margin: 40px auto; }\n.login h2 { margin-top: 0; }\n.login label { display: block; font-weight: 600; margin: 12px 0 4px; }\n.field { font: inherit; width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #CCCCCC; border-radius: 8px; }\n.submit { font: inherit; width: 100%; padding: 12px; margin-top: 16px; border: 0; border-radius: 8px; background-color: #CA2851; color: white; }' },
];
