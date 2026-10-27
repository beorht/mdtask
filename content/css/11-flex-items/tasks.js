// Тема 11. Flexbox: элементы и раскладки. Оформление уже в разметке, селекторы в :where() (нулевой вес).
const DECOR = `<style>
  :where(body) { font-family: "Open Sans", sans-serif; }
  :where(input, button) { font: inherit; padding: 8px 12px; }
  :where(.col, .side, .main, .plan, .card, .msg, .product) { background: #FFF3E6; padding: 12px; }
  :where(.b, .featured) { background: #FFB173; }
  :where(.side) { background: #DDE8F5; }
  :where(.header, .page header, .page footer) { background: #1C1A1B; color: #FFE3B3; padding: 10px 16px; }
  :where(.menu a) { color: #FFE3B3; padding: 4px 8px; }
  :where(.out) { background: #CA2851; color: white; }
  :where(.thumb, .pic) { width: 120px; height: 90px; }
  :where(div.thumb) { background: #FFB173; }
</style>`;
const SEARCH = `${DECOR}<form class="search"><input class="field" placeholder="Поиск по меню"><button class="go">Найти</button></form>`;
const COLS = `${DECOR}<div class="cols"><div class="col a">Первая</div><div class="col b">Вторая</div><div class="col c">Третья</div></div>`;
const LAYOUT = `${DECOR}<div class="layout"><aside class="side">Меню раздела</aside><main class="main">Основное содержимое страницы с текстом.</main></div>`;
const ROW = `${DECOR}<div class="row"><div class="thumb">Фото</div><p class="text">Очень длинное описание блюда: свежие овощи, соус песто, моцарелла, хрустящие гренки и микс салатов. Подаётся с лимоном и оливковым маслом первого отжима.</p></div>`;
const CARDS = `${DECOR}<div class="cards">
  <div class="card"><h3>Эспрессо</h3><p>Коротко и крепко.</p><button>Купить</button></div>
  <div class="card"><h3>Раф</h3><p>Сливки, ванильный сахар и эспрессо, взбитые паром до бархатной текстуры.</p><button>Купить</button></div>
  <div class="card"><h3>Какао</h3><p>Горячий шоколад с маршмеллоу.</p><button>Купить</button></div>
</div>`;
const HEADER = `${DECOR}<header class="header"><img class="logo" src="/img/css-course/logo.svg" alt=""><nav class="menu"><a href="#">Меню</a><a href="#">Акции</a><a href="#">Контакты</a></nav><button class="login">Войти</button></header>`;
const MENU = `${DECOR}<nav class="nav"><a href="#">Главная</a><a href="#">Меню</a><a href="#">Доставка</a><a href="#" class="exit">Выйти</a></nav>`;
const ORDER = `${DECOR}<div class="cols"><div class="col a">Первая</div><div class="col b">Вторая</div><div class="col c">Третья — важная</div></div>`;
const BUTTONS = `${DECOR}<div class="buttons"><button>Завтрак</button><button>Обед</button><button class="special">Ужин</button></div>`;
const MEDIA = `${DECOR}<div class="media"><img class="pic" src="/img/css-course/photo-3.svg" alt=""><div class="body"><h3>Салат «Цезарь»</h3><p>Курица, романо, пармезан, гренки и фирменный соус. Хит нашего меню уже пять лет.</p></div></div>`;
const CHAT = `${DECOR}<div class="chat">
  <p class="msg in">Здравствуйте! Можно забронировать столик?</p>
  <p class="msg out">Да, на какое время?</p>
  <p class="msg in">На 19:00, на четверых.</p>
  <p class="msg out">Готово, ждём вас!</p>
</div>`;
const PAGE = `${DECOR}<div class="page"><header>Кафе «Ромашка»</header><main class="main">Короткая страница.</main><footer>© 2026</footer></div>`;
const PRODUCT = `${DECOR}<div class="product"><img class="thumb" src="/img/css-course/photo-5.svg" alt=""><h3 class="title">Малиновый тарт</h3><span class="price">390 ₽</span><button>В корзину</button></div>`;
const PLANS = `${DECOR}<div class="plans">
  <div class="plan"><h3>Разовый</h3><p>1 кофе</p><p>250 ₽</p></div>
  <div class="plan featured"><h3>Абонемент</h3><p>10 кофе</p><p>2000 ₽</p><p>Выгодно!</p></div>
  <div class="plan"><h3>Семейный</h3><p>30 кофе</p><p>5400 ₽</p></div>
</div>`;
const INLINE = `${DECOR}<form class="inline"><label for="mail">Почта</label><input id="mail" class="mail" placeholder="you@mail.ru"><button>Подписаться</button></form>`;
const FULL = `${DECOR}<div class="page">
  <header>Кафе «Ромашка»</header>
  <div class="layout"><aside class="side">Разделы</aside><main class="main">Содержимое</main></div>
  <footer>© 2026</footer>
</div>`;
const FLEX = ['display: flex'];

module.exports = [
  { id: 'flexi-01', title: 'Растягивающийся поиск', description: 'Форма .search — flex с промежутком 8px; поле .field занимает всё свободное место (flex-grow), кнопка — своей ширины.', html: SEARCH, css: '.search { display: flex; gap: 8px; }\n.field { flex-grow: 1; }', require: FLEX },
  { id: 'flexi-02', title: 'Колонки 1 : 2', description: 'Колонки .cols — flex с промежутком 8px; первая и третья — по одной доле (flex: 1), вторая — две доли (flex: 2).', html: COLS, css: '.cols { display: flex; gap: 8px; }\n.a, .c { flex: 1; }\n.b { flex: 2; }', require: FLEX },
  { id: 'flexi-03', title: 'Колонки 3 : 1 : 1', description: 'Колонки — flex без промежутка; первая — три доли, вторая и третья — по одной.', html: COLS, css: '.cols { display: flex; }\n.a { flex: 3; }\n.b, .c { flex: 1; }', require: FLEX },
  { id: 'flexi-04', title: 'Боковая колонка', description: 'Обёртка .layout — flex с промежутком 16px; боковая колонка .side — ровно 200px (не растягивается и не сжимается), .main — всё остальное.', html: LAYOUT, css: '.layout { display: flex; gap: 16px; }\n.side { flex: 0 0 200px; }\n.main { flex: 1; }', require: FLEX },
  { id: 'flexi-05', title: 'Фото не сжимается', description: 'Строка .row — flex с промежутком 12px, ширина 420px; блок с фото .thumb не должен сжиматься из-за длинного текста (flex-shrink: 0).', html: ROW, css: '.row { display: flex; gap: 12px; width: 420px; }\n.thumb { flex-shrink: 0; }', require: [...FLEX, 'flex-shrink'] },
  { id: 'flexi-06', title: 'Базовая ширина', description: 'Карточки .cards — flex с переносом и промежутком 12px; каждая карточка — базовая ширина 220px (flex-basis) и растягивается на свободное место (flex-grow: 1).', html: CARDS, css: '.cards { display: flex; flex-wrap: wrap; gap: 12px; }\n.card { flex-basis: 220px; flex-grow: 1; }', require: [...FLEX, 'flex-basis'] },
  { id: 'flexi-07', title: 'Шапка с кнопкой входа', description: 'Шапка .header — flex, по центру по вертикали, промежуток 16px; меню .menu и кнопка уезжают вправо: у меню — margin-left: auto.', html: HEADER, css: '.header { display: flex; align-items: center; gap: 16px; }\n.menu { margin-left: auto; }', require: [...FLEX, 'margin-left: auto'] },
  { id: 'flexi-08', title: 'Последний пункт справа', description: 'Меню .nav — flex с промежутком 16px, фон #F4F1EC, отступ 10px; пункт «Выйти» (.exit) прижат к правому краю.', html: MENU, css: '.nav { display: flex; gap: 16px; background-color: #F4F1EC; padding: 10px; }\n.exit { margin-left: auto; }', require: FLEX },
  { id: 'flexi-09', title: 'Порядок без изменения HTML', description: 'Колонки — flex с промежутком 8px, каждая по одной доле; третью колонку покажите первой (order).', html: ORDER, css: '.cols { display: flex; gap: 8px; }\n.col { flex: 1; }\n.c { order: -1; }', require: [...FLEX, 'order'] },
  { id: 'flexi-10', title: 'Один элемент иначе', description: 'Кнопки — flex, высота контейнера 120px, фон #F4F1EC, все прижаты к верху (align-items: flex-start), промежуток 8px; кнопка .special — к низу (align-self).', html: BUTTONS, css: '.buttons { display: flex; height: 120px; background-color: #F4F1EC; align-items: flex-start; gap: 8px; }\n.special { align-self: flex-end; }', require: [...FLEX, 'align-self'] },
  { id: 'flexi-11', title: 'Кнопки на одной линии', description: 'Карточки — flex с промежутком 12px, каждая по одной доле; внутри карточки — flex-колонка; кнопка прижата к низу карточки (margin-top: auto).', html: CARDS, css: '.cards { display: flex; gap: 12px; }\n.card { flex: 1; display: flex; flex-direction: column; }\n.card button { margin-top: auto; }', require: [...FLEX, 'margin-top: auto'] },
  { id: 'flexi-12', title: 'Медиа-объект', description: 'Блок .media — flex с промежутком 16px и выравниванием по верху (align-items: flex-start); картинка не сжимается; у заголовка h3 нет отступа сверху.', html: MEDIA, css: '.media { display: flex; gap: 16px; align-items: flex-start; }\n.pic { flex-shrink: 0; }\n.body h3 { margin-top: 0; }', require: FLEX },
  { id: 'flexi-13', title: 'Чат', description: 'Чат .chat — flex-колонка с промежутком 8px, ширина 420px; сообщения .msg — без внешних отступов (margin 0) и не шире 70%; входящие .in — слева, исходящие .out — справа (align-self).', html: CHAT, css: '.chat { display: flex; flex-direction: column; gap: 8px; width: 420px; }\n.msg { margin: 0; max-width: 70%; }\n.in { align-self: flex-start; }\n.out { align-self: flex-end; }', require: [...FLEX, 'align-self'] },
  { id: 'flexi-14', title: 'Подвал внизу страницы', description: 'У body уберите внешний отступ. Обёртка .page — flex-колонка высотой не меньше окна (min-height: 100vh); основная часть .main растягивается (flex: 1), поэтому подвал прижат к низу.', html: PAGE, css: 'body { margin: 0; }\n.page { display: flex; flex-direction: column; min-height: 100vh; }\n.main { flex: 1; }', require: [...FLEX, 'min-height'] },
  { id: 'flexi-15', title: 'Строка товара', description: 'Блок .product — flex, по центру по вертикали, промежуток 16px; название .title растягивается на свободное место (flex: 1) и без внешних отступов (margin 0).', html: PRODUCT, css: '.product { display: flex; align-items: center; gap: 16px; }\n.title { flex: 1; margin: 0; }', require: FLEX },
  { id: 'flexi-16', title: 'Тарифы', description: 'Тарифы .plans — flex с промежутком 16px и выравниванием по центру по вертикали (align-items: center); все тарифы по одной доле; средний .featured выше за счёт отступа 32px 12px.', html: PLANS, css: '.plans { display: flex; gap: 16px; align-items: center; }\n.plan { flex: 1; }\n.featured { padding: 32px 12px; }', require: FLEX },
  { id: 'flexi-17', title: 'Форма в строку', description: 'Форма .inline — flex по центру по вертикали с промежутком 8px; поле .mail растягивается.', html: INLINE, css: '.inline { display: flex; align-items: center; gap: 8px; }\n.mail { flex: 1; }', require: FLEX },
  { id: 'flexi-18', title: 'Страница целиком', description: 'Как в образце: body без отступа; .page — flex-колонка не ниже окна; .layout растягивается (flex: 1) и сам flex; .side — ровно 180px; .main — остальное.', html: FULL, css: 'body { margin: 0; }\n.page { display: flex; flex-direction: column; min-height: 100vh; }\n.layout { flex: 1; display: flex; }\n.side { flex: 0 0 180px; }\n.main { flex: 1; }', require: FLEX },
];
