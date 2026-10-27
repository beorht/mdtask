// Тема 17. Адаптивная вёрстка: каждое задание проверяется на трёх ширинах. Оформление в :where (нулевой вес).
const W = [375, 768, 1200];
const DECOR = `<style>
  :where(body) { font-family: "Open Sans", sans-serif; margin: 0; }
  :where(.header) { background: #1C1A1B; color: #FFE3B3; padding: 10px 16px; }
  :where(.menu a) { color: #FFE3B3; padding: 4px 8px; }
  :where(.burger) { cursor: pointer; }
  :where(.col, .card, .side) { background: #FFF3E6; padding: 12px; }
  :where(.side) { background: #DDE8F5; }
  :where(.order) { font: inherit; padding: 6px 12px; }
  :where(.form input) { font: inherit; padding: 8px; }
  :where(table) { border-collapse: collapse; }
  :where(th, td) { border: 1px solid #CCCCCC; padding: 6px 10px; }
  :where(.footer) { background: #1C1A1B; color: #FFE3B3; padding: 16px; }
  :where(.footer ul) { list-style: none; padding: 0; margin: 0; }
</style>`;
const PAGE = `${DECOR}
<header class="header">
  <img class="logo" src="/img/css-course/logo.svg" alt="Кафе">
  <input type="checkbox" id="nav-toggle" class="nav-toggle"><label for="nav-toggle" class="burger">☰ Меню</label>
  <nav class="menu"><a href="#">Главная</a><a href="#">Меню</a><a href="#">Доставка</a><a href="#">Контакты</a></nav>
  <button class="order">Заказать</button>
</header>
<main class="container">
  <h1>Кафе «Ромашка» — завтраки весь день</h1>
  <img class="banner" src="/img/css-course/banner.svg" alt="">
  <div class="cols"><div class="col">О нас: варим кофе с 2010 года.</div><div class="col">Где мы: у входа в парк.</div></div>
  <div class="layout"><aside class="side">Разделы меню</aside><div class="cards">${['Эспрессо', 'Капучино', 'Латте', 'Раф', 'Какао', 'Чай', 'Матча', 'Морс'].map((t) => `<div class="card">${t}</div>`).join('')}</div></div>
  <form class="form"><input placeholder="Имя"><input placeholder="Телефон"><input placeholder="Дата"><input placeholder="Гостей"></form>
  <div class="table-wrap"><table><tr><th>Напиток</th><th>Объём</th><th>Цена</th><th>Калории</th><th>Сахар</th><th>Кофеин</th></tr><tr><td>Капучино</td><td>250 мл</td><td>220 ₽</td><td>120</td><td>нет</td><td>да</td></tr></table></div>
</main>
<footer class="footer"><div class="fcols"><ul><li>О нас</li><li>Вакансии</li></ul><ul><li>Меню</li><li>Акции</li></ul><ul><li>+7 900 000-00-00</li></ul></div></footer>`;
const MEDIA = ['@media'];

module.exports = [
  { id: 'resp-01', title: 'Резиновый контейнер', description: 'Контейнер .container — не шире 960px, по центру, поля слева и справа по 16px.', html: PAGE, widths: W, css: '.container { max-width: 960px; margin: 0 auto; padding: 0 16px; }', require: ['max-width'] },
  { id: 'resp-02', title: 'Картинка не вылезает', description: 'Баннер .banner (исходная ширина 1200px) не должен вылезать за край: max-width 100% и height auto.', html: PAGE, widths: W, css: '.banner { height: auto; max-width: 100%; }', require: ['max-width'] },
  { id: 'resp-03', title: 'Шрифт растёт с экраном', description: 'Заголовку h1 — размер clamp(24px, 5vw, 48px): не меньше 24px, не больше 48px, между ними — 5% ширины окна.', html: PAGE, widths: W, css: 'h1 { font-size: clamp(24px, 5vw, 48px); }', require: ['clamp('] },
  { id: 'resp-04', title: 'Первый медиазапрос', description: 'Если экран не шире 600px, у body фон #FFF3E6.', html: PAGE, widths: W, css: '@media (max-width: 600px) { body { background-color: #FFF3E6; } }', require: MEDIA },
  { id: 'resp-05', title: 'Две колонки → одна (flex)', description: 'Блок .cols — flex с промежутком 16px, колонки .col по одной доле; на экране до 600px колонки встают одна под другой (flex-direction: column).', html: PAGE, widths: W, css: '.cols { display: flex; gap: 16px; }\n.col { flex: 1; }\n@media (max-width: 600px) { .cols { flex-direction: column; } }', require: MEDIA },
  { id: 'resp-06', title: 'Две колонки → одна (grid)', description: 'То же на grid: .cols — две равные колонки, промежуток 16px; до 600px — одна колонка.', html: PAGE, widths: W, css: '.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }\n@media (max-width: 600px) { .cols { grid-template-columns: 1fr; } }', require: [...MEDIA, 'display: grid'] },
  { id: 'resp-07', title: 'Карточки 4 → 2 → 1', description: 'Карточки .cards — сетка из 4 равных колонок с промежутком 12px; до 1000px — 2 колонки; до 600px — 1.', html: PAGE, widths: W, css: '.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }\n@media (max-width: 1000px) { .cards { grid-template-columns: repeat(2, 1fr); } }\n@media (max-width: 600px) { .cards { grid-template-columns: 1fr; } }', require: MEDIA },
  { id: 'resp-08', title: 'Сначала телефон', description: 'Mobile first: .cards — grid с промежутком 12px в одну колонку; от 768px — 2 колонки, от 1100px — 4 (min-width).', html: PAGE, widths: W, css: '.cards { display: grid; gap: 12px; }\n@media (min-width: 768px) { .cards { grid-template-columns: repeat(2, 1fr); } }\n@media (min-width: 1100px) { .cards { grid-template-columns: repeat(4, 1fr); } }', require: [...MEDIA, 'min-width'] },
  { id: 'resp-09', title: 'Меню: колонка и строка', description: 'Меню .menu — flex-колонка с промежутком 4px; от 768px — в строку с промежутком 16px.', html: PAGE, widths: W, css: '.menu { display: flex; flex-direction: column; gap: 4px; }\n@media (min-width: 768px) { .menu { flex-direction: row; gap: 16px; } }', require: MEDIA },
  { id: 'resp-10', title: 'Убрать колонку на телефоне', description: 'Блок .layout — flex с промежутком 16px; .side — ровно 220px, .cards растягивается; на экране до 767px .side скрыт.', html: PAGE, widths: W, css: '.layout { display: flex; gap: 16px; }\n.side { flex: 0 0 220px; }\n.cards { flex: 1; }\n@media (max-width: 767px) { .side { display: none; } }', require: MEDIA },
  { id: 'resp-11', title: 'Меню-«бургер»', description: 'Флажок .nav-toggle спрятан; меню .menu скрыто, пока флажок не отмечен, а когда отмечен — flex-колонка (.nav-toggle:checked ~ .menu). От 768px «бургер» .burger скрыт, а меню всегда видно в строку с промежутком 16px (селектор .header .menu).', html: PAGE, widths: W, css: '.nav-toggle { display: none; }\n.menu { display: none; }\n.nav-toggle:checked ~ .menu { display: flex; flex-direction: column; }\n@media (min-width: 768px) {\n  .burger { display: none; }\n  .header .menu { display: flex; flex-direction: row; gap: 16px; }\n}', states: [{ selector: '#nav-toggle', state: 'checked' }], require: [...MEDIA, ':checked'] },
  { id: 'resp-12', title: 'Таблица с прокруткой', description: 'Обёртке .table-wrap — горизонтальная прокрутка (overflow-x: auto); таблице — не уже 640px (min-width) и ширина 100%.', html: PAGE, widths: W, css: '.table-wrap { overflow-x: auto; }\ntable { min-width: 640px; width: 100%; }', require: ['overflow-x'] },
  { id: 'resp-13', title: 'Форма: две колонки → одна', description: 'Форма .form — сетка из двух равных колонок с промежутком 12px; до 600px — одна колонка.', html: PAGE, widths: W, css: '.form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }\n@media (max-width: 600px) { .form { grid-template-columns: 1fr; } }', require: MEDIA },
  { id: 'resp-14', title: 'Шапка на телефоне', description: 'Шапка .header — flex, по центру по вертикали, края раздвинуты (space-between); «бургер» и флажок скрыты; меню — flex с промежутком 12px; до 767px меню скрыто (логотип и кнопка остаются).', html: PAGE, widths: W, css: '.header { display: flex; align-items: center; justify-content: space-between; }\n.nav-toggle, .burger { display: none; }\n.menu { display: flex; gap: 12px; }\n@media (max-width: 767px) { .menu { display: none; } }', require: MEDIA },
  { id: 'resp-15', title: 'Подвал складывается', description: 'Колонки подвала .fcols — flex с промежутком 24px, края раздвинуты (space-between); до 600px — колонкой.', html: PAGE, widths: W, css: '.fcols { display: flex; gap: 24px; justify-content: space-between; }\n@media (max-width: 600px) { .fcols { flex-direction: column; } }', require: MEDIA },
  { id: 'resp-16', title: 'Без единого @media', description: 'Карточки .cards перестраиваются сами: grid, repeat(auto-fit, minmax(160px, 1fr)), промежуток 12px. @media использовать нельзя.', html: PAGE, widths: W, css: '.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }', require: ['auto-fit'], forbid: MEDIA },
  { id: 'resp-17', title: 'Заголовок на разных экранах', description: 'Заголовок h1 — 28px; от 768px — 40px; от 1100px — 52px.', html: PAGE, widths: W, css: 'h1 { font-size: 28px; }\n@media (min-width: 768px) { h1 { font-size: 40px; } }\n@media (min-width: 1100px) { h1 { font-size: 52px; } }', require: MEDIA },
  { id: 'resp-18', title: 'Лендинг на трёх экранах', description: 'Соберите: контейнер (не шире 960px, по центру, поля 16px), баннер не вылезает (max-width 100%, height auto), шапка как в задании 14, карточки 1 → 2 → 4 колонки (от 768px и от 1100px, промежуток 12px), .side скрыт до 767px, подвал как в задании 15.', html: PAGE, widths: W, css: '.container { max-width: 960px; margin: 0 auto; padding: 0 16px; }\n.banner { max-width: 100%; height: auto; }\n.header { display: flex; align-items: center; justify-content: space-between; }\n.nav-toggle, .burger { display: none; }\n.menu { display: flex; gap: 12px; }\n.cards { display: grid; gap: 12px; }\n.fcols { display: flex; gap: 24px; justify-content: space-between; }\n@media (max-width: 767px) { .menu, .side { display: none; } }\n@media (max-width: 600px) { .fcols { flex-direction: column; } }\n@media (min-width: 768px) { .cards { grid-template-columns: repeat(2, 1fr); } }\n@media (min-width: 1100px) { .cards { grid-template-columns: repeat(4, 1fr); } }', require: MEDIA },
];
