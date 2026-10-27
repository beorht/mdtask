// Тема 13. Grid: области и макеты страниц. Оформление в разметке (:where — нулевой вес).
const DECOR = `<style>
  :where(body) { font-family: "Open Sans", sans-serif; margin: 0; }
  :where(.top, .bottom) { background: #1C1A1B; color: #FFE3B3; padding: 12px; }
  :where(.menu, .extra) { background: #DDE8F5; padding: 12px; }
  :where(.content) { background: #FFF3E6; padding: 12px; min-height: 120px; }
  :where(.card, .story, .stat, .tile) { background: #FFB173; padding: 12px; }
  :where(.lead-story) { background: #CA2851; color: white; }
  :where(.gallery img, .article img, .avatar) { display: block; width: 100%; }
  :where(input, button) { font: inherit; padding: 8px; }
</style>`;
const PAGE = `${DECOR}<div class="page">
  <header class="top">Кафе «Ромашка»</header>
  <nav class="menu">Разделы</nav>
  <main class="content">Содержимое страницы</main>
  <aside class="extra">Акции</aside>
  <footer class="bottom">© 2026</footer>
</div>`;
const SIMPLE = `${DECOR}<div class="page">
  <footer class="bottom">© 2026</footer>
  <header class="top">Кафе «Ромашка»</header>
  <main class="content">Содержимое страницы</main>
</div>`;
const GALLERY = (n) => `${DECOR}<div class="gallery">${Array.from({ length: n }, (_, i) => `<img src="/img/css-course/photo-${(i % 6) + 1}.svg" alt="">`).join('')}</div>`;
const CARDS = `${DECOR}<div class="cards">${[['Эспрессо', 'Крепкий.'], ['Капучино', 'Эспрессо и много нежной молочной пены, посыпанной корицей.'], ['Латте', 'Мягкий.'], ['Раф', 'Сливки, ванильный сахар и эспрессо, взбитые паром.'], ['Какао', 'Горячий шоколад.'], ['Чай', 'Чёрный или зелёный на выбор, с лимоном, мёдом или имбирём.'], ['Матча', 'Японский зелёный чай.'], ['Морс', 'Клюква.']].map(([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p><button>Купить</button></div>`).join('')}</div>`;
const NEWS = `${DECOR}<div class="news">
  <article class="story lead-story"><h2>Открываем летнюю веранду</h2><p>С 1 июня — завтраки на свежем воздухе.</p></article>
  <article class="story">Новое меню десертов</article>
  <article class="story">Мастер-класс по латте-арту</article>
  <article class="story">Скидка студентам</article>
  <article class="story">Доставка до 23:00</article>
</div>`;
const PROFILE = `${DECOR}<div class="profile">
  <img class="avatar" src="/img/css-course/avatar.svg" alt="">
  <h2 class="name">Анна Петрова</h2>
  <div class="stats"><span>120 заказов</span> · <span>4.9 ★</span></div>
  <div class="actions"><button>Написать</button><button>Подписаться</button></div>
</div>`;
const DASH = `${DECOR}<div class="dash">
  <nav class="menu">Меню панели</nav>
  <header class="top">Панель управления</header>
  <main class="tiles"><div class="tile">Заказы: 48</div><div class="tile">Выручка: 31 200 ₽</div><div class="tile">Гости: 112</div><div class="tile">Отзывы: 9</div></main>
</div>`;
const ARTICLE = `${DECOR}<article class="article">
  <img src="/img/css-course/photo-4.svg" alt="">
  <div class="text"><h3>Как варить кофе в турке</h3><p>Пошаговый рецепт от нашего бариста: вода, помол, огонь и терпение.</p><p class="author">Анна Петрова</p></div>
</article>`;
const FORM = `${DECOR}<form class="form">
  <label for="n">Имя</label><input id="n">
  <label for="p">Телефон</label><input id="p">
  <label for="d">Дата</label><input id="d">
  <button class="send">Забронировать</button>
</form>`;
const GRID = ['display: grid'];

module.exports = [
  { id: 'areas-01', title: 'Шапка, контент, подвал', description: 'Обёртка .page — сетка из одной колонки с областями "header" "main" "footer" (grid-template-areas); блоки .top, .content, .bottom разместите по областям (grid-area); строки: auto 1fr auto, высота .page — 100vh.', html: SIMPLE, css: '.top { grid-area: header; }\n.content { grid-area: main; }\n.bottom { grid-area: footer; }\n.page { display: grid; height: 100vh; grid-template-rows: auto 1fr auto; grid-template-areas: "header" "main" "footer"; }', require: [...GRID, 'grid-template-areas'] },
  { id: 'areas-02', title: 'Меню слева', description: 'Сетка .page: колонки 200px и 1fr; области "header header" / "nav main" / "footer footer"; .extra уберите (display: none); остальные блоки — по своим областям.', html: PAGE, css: '.page { display: grid; grid-template-columns: 200px 1fr; grid-template-areas: "header header" "nav main" "footer footer"; }\n.top { grid-area: header; }\n.menu { grid-area: nav; }\n.content { grid-area: main; }\n.bottom { grid-area: footer; }\n.extra { display: none; }', require: [...GRID, 'grid-template-areas'] },
  { id: 'areas-03', title: 'Две боковые колонки', description: 'Сетка .page: колонки 180px 1fr 180px; области "header header header" / "nav main aside" / "footer footer footer"; промежуток 8px.', html: PAGE, css: '.page { display: grid; grid-template-columns: 180px 1fr 180px; gap: 8px; grid-template-areas: "header header header" "nav main aside" "footer footer footer"; }\n.top { grid-area: header; }\n.menu { grid-area: nav; }\n.content { grid-area: main; }\n.extra { grid-area: aside; }\n.bottom { grid-area: footer; }', require: [...GRID, 'grid-template-areas'] },
  { id: 'areas-04', title: 'Поменять местами', description: 'Как в прошлом задании (колонки 180px 1fr 180px, промежуток 8px), но меню .menu — справа, а акции .extra — слева. Разметку не трогать.', html: PAGE, css: '.page { display: grid; grid-template-columns: 180px 1fr 180px; gap: 8px; grid-template-areas: "header header header" "aside main nav" "footer footer footer"; }\n.top { grid-area: header; }\n.menu { grid-area: nav; }\n.content { grid-area: main; }\n.extra { grid-area: aside; }\n.bottom { grid-area: footer; }', require: [...GRID, 'grid-template-areas'] },
  { id: 'areas-05', title: 'Пустая ячейка', description: 'Сетка .page: колонки 200px 1fr; области "header header" / ". main" / "footer footer" — слева от контента пусто; .menu и .extra уберите.', html: PAGE, css: '.page { display: grid; grid-template-columns: 200px 1fr; grid-template-areas: "header header" ". main" "footer footer"; }\n.top { grid-area: header; }\n.content { grid-area: main; }\n.bottom { grid-area: footer; }\n.menu, .extra { display: none; }', require: [...GRID, 'grid-template-areas'] },
  { id: 'areas-06', title: 'Колонка не уже 300px', description: 'Сетка .page: две колонки — minmax(300px, 1fr) и 3fr; промежуток 8px; блоки встают по порядку.', html: SIMPLE, css: '.page { display: grid; grid-template-columns: minmax(300px, 1fr) 3fr; gap: 8px; }', require: [...GRID, 'minmax('] },
  { id: 'areas-07', title: 'Галерея auto-fill', description: 'Галерея .gallery — repeat(auto-fill, minmax(150px, 1fr)), промежуток 8px.', html: GALLERY(10), css: '.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }', require: [...GRID, 'auto-fill'] },
  { id: 'areas-08', title: 'auto-fit', description: 'В галерее всего три фото. Сделайте так, чтобы они растянулись на всю ширину: repeat(auto-fit, minmax(150px, 1fr)), промежуток 8px.', html: GALLERY(3), css: '.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }', require: [...GRID, 'auto-fit'] },
  { id: 'areas-09', title: 'Каталог товаров', description: 'Карточки .cards — сетка repeat(auto-fill, minmax(180px, 1fr)), промежуток 16px, внешний отступ 16px.', html: CARDS, css: '.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin: 16px; }', require: GRID },
  { id: 'areas-10', title: 'Главная новостей', description: 'Сетка .news — три равные колонки, строки по 120px, промежуток 10px; главная новость .lead-story — 2 колонки и 2 строки.', html: NEWS, css: '.news { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 120px; gap: 10px; }\n.lead-story { grid-column: span 2; grid-row: span 2; }', require: GRID },
  { id: 'areas-11', title: 'Профиль', description: 'Сетка .profile — колонки 120px 1fr, промежуток 8px 16px, отступ 16px; области "avatar name" / "avatar stats" / "avatar actions"; у заголовка .name нет внешних отступов.', html: PROFILE, css: '.profile { display: grid; grid-template-columns: 120px 1fr; gap: 8px 16px; padding: 16px; grid-template-areas: "avatar name" "avatar stats" "avatar actions"; }\n.avatar { grid-area: avatar; }\n.stats { grid-area: stats; }\n.actions { grid-area: actions; }\n.name { grid-area: name; margin: 0; }', require: [...GRID, 'grid-template-areas'] },
  { id: 'areas-12', title: 'Панель управления', description: 'Сетка .dash — колонки 180px 1fr, высота 100vh; области "nav header" / "nav main" (строки auto 1fr). Плитки .tiles — своя сетка: 2 равные колонки, промежуток 12px, отступ 12px.', html: DASH, css: '.dash { display: grid; height: 100vh; grid-template-columns: 180px 1fr; grid-template-rows: auto 1fr; grid-template-areas: "nav header" "nav main"; }\n.menu { grid-area: nav; }\n.top { grid-area: header; }\n.tiles { grid-area: main; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; }', require: GRID },
  { id: 'areas-13', title: 'Карточка статьи', description: 'Статья .article — сетка: колонки 200px 1fr, промежуток 16px, выравнивание по верху (align-items: start); у h3 нет отступа сверху; подпись .author — цвет #888888.', html: ARTICLE, css: '.article { display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: start; }\n.text h3 { margin-top: 0; }\n.author { color: #888888; }', require: GRID },
  { id: 'areas-14', title: 'Форма на сетке', description: 'Форма .form — сетка: колонки 120px 1fr, промежуток 10px, выравнивание по центру по вертикали, ширина 420px; кнопка .send — во второй колонке (grid-column: 2).', html: FORM, css: '.form { display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: center; width: 420px; }\n.send { grid-column: 2; }', require: GRID },
  { id: 'areas-15', title: 'Grid снаружи, flex внутри', description: 'Карточки .cards — сетка из 4 равных колонок, промежуток 12px; каждая карточка — flex-колонка, кнопка прижата к низу (margin-top: auto).', html: CARDS, css: '.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }\n.card { display: flex; flex-direction: column; }\n.card button { margin-top: auto; }', require: [...GRID, 'display: flex'] },
  { id: 'areas-16', title: 'Лендинг по образцу', description: 'Как в образце: .page — сетка с колонками 160px 1fr 160px, промежутком 12px и областями "header header header" / "nav main aside" / "footer footer footer"; высота .page — не меньше 100vh, строки auto 1fr auto; блоки по своим областям.', html: PAGE, css: '.page { display: grid; min-height: 100vh; grid-template-columns: 160px 1fr 160px; grid-template-rows: auto 1fr auto; gap: 12px; grid-template-areas: "header header header" "nav main aside" "footer footer footer"; }\n.top { grid-area: header; }\n.menu { grid-area: nav; }\n.content { grid-area: main; }\n.extra { grid-area: aside; }\n.bottom { grid-area: footer; }', require: [...GRID, 'grid-template-areas'] },
];
