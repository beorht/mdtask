// Тема 10. Flexbox: контейнер. Оформление (цвета, отступы) уже в разметке — студент делает раскладку. Селекторы
// оформления в :where() (нулевой вес): разметка подключается после CSS студента, и его правила должны побеждать.
const DECOR = `<style>
  :where(body) { font-family: "Open Sans", sans-serif; }
  :where(.header) { background: #1C1A1B; padding: 10px 16px; }
  :where(.menu a) { color: #FFE3B3; text-decoration: none; padding: 6px 10px; background: #3B3835; }
  :where(.buttons button) { display: block; padding: 8px 16px; background: #CA2851; color: white; border: 0; }
  :where(.card) { background: #FFB173; padding: 12px; }
  :where(.screen) { background: #1F3F66; }
  :where(.box) { background: #FFE3B3; padding: 16px 24px; }
  :where(.tag) { background: #FFE3B3; padding: 4px 12px; border-radius: 999px; }
  :where(.toolbar) { background: #F4F1EC; padding: 8px; }
  :where(.toolbar button) { padding: 6px 12px; }
  :where(.steps li) { background: #DDE8F5; padding: 8px 14px; }
  :where(.steps .arrow) { background: none; padding: 0; }
  :where(.footer) { background: #1C1A1B; color: #FFE3B3; padding: 16px; }
  :where(.footer ul) { list-style: none; padding: 0; margin: 0; }
</style>`;
const HEADER = `${DECOR}
<header class="header">
  <img class="logo" src="/img/css-course/logo.svg" alt="Кафе">
  <nav class="menu"><a href="#">Главная</a><a href="#">Меню</a><a href="#">Акции</a><a href="#">Контакты</a></nav>
</header>`;
const BUTTONS = `${DECOR}
<div class="buttons"><button>Завтрак</button><button>Обед</button><button>Ужин</button></div>`;
const SCREEN = `${DECOR}
<div class="screen"><div class="box">Скоро открытие</div></div>`;
const ITEM = `${DECOR}
<p class="item"><img class="icon" src="/img/css-course/icon-star.svg" alt=""><span>Рейтинг 4.9 · 320 отзывов</span></p>`;
const CARDS = `${DECOR}
<div class="cards">
  <div class="card">Эспрессо</div><div class="card">Капучино</div><div class="card">Латте</div>
  <div class="card">Раф</div><div class="card">Какао</div><div class="card">Чай</div>
</div>`;
const TAGS = `${DECOR}
<div class="tags">
  <span class="tag">кофе</span><span class="tag">десерты</span><span class="tag">завтраки весь день</span>
  <span class="tag">веганское</span><span class="tag">без сахара</span><span class="tag">сезонное</span>
  <span class="tag">с собой</span><span class="tag">доставка</span><span class="tag">новинки</span>
</div>`;
const TOOLBAR = `${DECOR}
<div class="toolbar">
  <div class="group"><button>Жирный</button><button>Курсив</button><button>Ссылка</button></div>
  <div class="group"><button>Отменить</button><button>Сохранить</button></div>
</div>`;
const STEPS = `${DECOR}
<ol class="steps">
  <li>Корзина</li><li class="arrow">→</li><li>Доставка</li><li class="arrow">→</li><li>Оплата</li>
</ol>`;
const FOOTER = `${DECOR}
<footer class="footer">
  <div class="cols">
    <ul><li>О нас</li><li>Вакансии</li></ul>
    <ul><li>Меню</li><li>Доставка</li><li>Акции</li></ul>
    <ul><li>+7 900 000-00-00</li><li>hello@cafe.ru</li></ul>
  </div>
  <p class="copy">© 2026 Кафе «Ромашка»</p>
</footer>`;
const FLEX = ['display: flex'];

module.exports = [
  { id: 'flexc-01', title: 'Кнопки в ряд', description: 'Поставьте три кнопки в один ряд: блок .buttons — flex-контейнер.', html: BUTTONS, css: '.buttons { display: flex; }', require: FLEX },
  { id: 'flexc-02', title: 'Промежуток gap', description: 'Пункты меню .menu — в ряд с промежутком 12px (gap).', html: HEADER, css: '.menu { display: flex; gap: 12px; }', require: [...FLEX, 'gap'] },
  { id: 'flexc-03', title: 'Логотип слева, меню справа', description: 'Шапка .header — flex: логотип прижат влево, меню — вправо (space-between), всё по центру по вертикали. Меню — тоже в ряд с промежутком 8px.', html: HEADER, css: '.header { display: flex; justify-content: space-between; align-items: center; }\n.menu { display: flex; gap: 8px; }', require: FLEX },
  { id: 'flexc-04', title: 'Меню по центру', description: 'Меню .menu — в ряд, по центру шапки, с промежутком 16px.', html: HEADER, css: '.menu { display: flex; justify-content: center; gap: 16px; }', require: FLEX },
  { id: 'flexc-05', title: 'Точно по центру', description: 'Блок .screen высотой 300px; плашка .box — ровно по центру и по горизонтали, и по вертикали.', html: SCREEN, css: '.screen { height: 300px; display: flex; justify-content: center; align-items: center; }', require: FLEX },
  { id: 'flexc-06', title: 'Иконка и подпись', description: 'Абзац .item — flex: иконка и текст на одной линии по центру по вертикали, промежуток 8px; иконка 32×32.', html: ITEM, css: '.item { display: flex; align-items: center; gap: 8px; }\n.icon { width: 32px; height: 32px; }', require: FLEX },
  { id: 'flexc-07', title: 'Колонка карточек', description: 'Карточки .cards — колонкой сверху вниз (flex-direction) с промежутком 10px, ширина колонки 240px.', html: CARDS, css: '.cards { display: flex; flex-direction: column; gap: 10px; width: 240px; }', require: [...FLEX, 'flex-direction: column'] },
  { id: 'flexc-08', title: 'Обратный порядок', description: 'Не меняя разметку, выведите пункты меню в обратном порядке справа налево (row-reverse) с промежутком 8px.', html: HEADER, css: '.menu { display: flex; flex-direction: row-reverse; gap: 8px; }', require: [...FLEX, 'row-reverse'] },
  { id: 'flexc-09', title: 'Равные промежутки', description: 'Кнопки .buttons — в ряд, и все промежутки (и у краёв) равны (space-evenly); фон контейнера #F4F1EC.', html: BUTTONS, css: '.buttons { display: flex; justify-content: space-evenly; background-color: #F4F1EC; }', require: FLEX },
  { id: 'flexc-10', title: 'Перенос на новую строку', description: 'Карточки .cards — в ряд с переносом (flex-wrap), промежуток 16px; каждая карточка шириной 220px.', html: CARDS, css: '.cards { display: flex; flex-wrap: wrap; gap: 16px; }\n.card { width: 220px; }', require: [...FLEX, 'flex-wrap: wrap'] },
  { id: 'flexc-11', title: 'Разные промежутки', description: 'Карточки — в ряд с переносом; между строками 24px (row-gap), между столбцами 8px (column-gap); ширина карточки 180px.', html: CARDS, css: '.cards { display: flex; flex-wrap: wrap; row-gap: 24px; column-gap: 8px; }\n.card { width: 180px; }', require: FLEX },
  { id: 'flexc-12', title: 'Кнопки внизу', description: 'Контейнер .buttons — высота 140px, фон #F4F1EC, flex; кнопки прижаты к низу (align-items) и стоят справа (justify-content), промежуток 8px.', html: BUTTONS, css: '.buttons { display: flex; height: 140px; background-color: #F4F1EC; align-items: flex-end; justify-content: flex-end; gap: 8px; }', require: FLEX },
  { id: 'flexc-13', title: 'Облако меток', description: 'Метки .tags — в ряд с переносом, промежуток 8px; ширина контейнера 420px.', html: TAGS, css: '.tags { display: flex; flex-wrap: wrap; gap: 8px; width: 420px; }', require: FLEX },
  { id: 'flexc-14', title: 'Панель инструментов', description: 'Панель .toolbar — flex: одна группа кнопок слева, другая справа. Внутри каждой .group кнопки — в ряд с промежутком 4px.', html: TOOLBAR, css: '.toolbar { display: flex; justify-content: space-between; }\n.group { display: flex; gap: 4px; }', require: FLEX },
  { id: 'flexc-15', title: 'Шаги заказа', description: 'Список .steps — в ряд, по центру по вертикали, промежуток 12px, без маркеров (list-style: none) и без отступа слева (padding-left: 0).', html: STEPS, css: '.steps { display: flex; align-items: center; gap: 12px; list-style: none; padding-left: 0; }', require: FLEX },
  { id: 'flexc-16', title: 'Подвал сайта', description: 'Блок .cols — три колонки списков в ряд, раздвинутые по краям (space-between), с промежутком 24px; копирайт .copy — по центру, внешний отступ сверху 16px и снизу 0.', html: FOOTER, css: '.cols { display: flex; justify-content: space-between; gap: 24px; }\n.copy { text-align: center; margin: 16px 0 0; }', require: FLEX },
];
