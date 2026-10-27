// Тема 2. Селекторы. Одна страница кафе на все задания: выбрать нужные элементы и только их.
const PAGE = `
<header id="top">
  <nav class="menu">
    <a href="#home" class="active">Главная</a>
    <a href="#menu">Меню</a>
    <a href="https://delivery.example">Доставка</a>
  </nav>
</header>
<article class="post">
  <h2 class="post-title">Новый сезон</h2>
  <p>Первый абзац статьи о новых десертах.</p>
  <p class="note">Важно: акция действует до конца месяца.</p>
  <div class="quote"><p>«Лучший чизкейк в городе» — гость кафе.</p></div>
  <p>Последний абзац. <a href="price.pdf">Прайс-лист (PDF)</a></p>
</article>
<form class="subscribe">
  <input type="text" placeholder="Имя">
  <input type="email" placeholder="Почта">
  <button>Подписаться</button>
</form>`;

module.exports = [
  { id: 'selectors-01', title: 'Все абзацы', description: 'Сделайте все абзацы (p) цветом #555555.', html: PAGE, css: 'p { color: #555555; }' },
  { id: 'selectors-02', title: 'По классу', description: 'Абзацу с классом note задайте фон #FFE3B3.', html: PAGE, css: '.note { background-color: #FFE3B3; }' },
  { id: 'selectors-03', title: 'По id', description: 'Шапке с id="top" задайте фон #1C1A1B.', html: PAGE, css: '#top { background-color: #1C1A1B; }' },
  { id: 'selectors-04', title: 'Группа селекторов', description: 'Одним правилом сделайте заголовок статьи и кнопку цветом #CA2851.', html: PAGE, css: '.post-title, button { color: #CA2851; }' },
  { id: 'selectors-05', title: 'Ссылки меню', description: 'Только ссылки внутри меню (.menu) — цветом #FF6766 и без подчёркивания. Ссылка на прайс-лист остаётся как была.', html: PAGE, css: '.menu a { color: #FF6766; text-decoration: none; }' },
  { id: 'selectors-06', title: 'Только дети', description: 'Абзацы, которые лежат прямо в article (не внутри .quote), — размером 18px.', html: PAGE, css: '.post > p { font-size: 18px; }' },
  { id: 'selectors-07', title: 'Сразу после заголовка', description: 'Абзац, стоящий сразу после заголовка статьи, — жирным (font-weight: bold).', html: PAGE, css: '.post-title + p { font-weight: bold; }' },
  { id: 'selectors-08', title: 'Все абзацы после примечания', description: 'Все абзацы того же уровня, что идут после .note, — курсивом.', html: PAGE, css: '.note ~ p { font-style: italic; }' },
  { id: 'selectors-09', title: 'Поле для почты', description: 'Только полю type="email" задайте рамку 2px solid #CA2851.', html: PAGE, css: 'input[type="email"] { border: 2px solid #CA2851; }' },
  { id: 'selectors-10', title: 'Внешние ссылки и PDF', description: 'Ссылкам, адрес которых начинается с https, — цвет #2E7D4F; ссылке на файл .pdf — цвет #7A4FB0 и жирный шрифт.', html: PAGE, css: 'a[href^="https"] { color: #2E7D4F; }\na[href$=".pdf"] { color: #7A4FB0; font-weight: bold; }' },
];
