// Тема 8. display и поток.
const PAGE = `
<ul class="menu">
  <li><a href="#">Главная</a></li>
  <li><a href="#">Меню</a></li>
  <li><a href="#">Контакты</a></li>
</ul>
<p class="promo">Скидка 20% на всё до пятницы!</p>
<p class="tags"><span class="tag">кофе</span> <span class="tag">десерты</span> <span class="tag">завтраки</span></p>
<div class="review">Отзыв гостя: всё очень понравилось, особенно чизкейк и тыквенный латте. Обязательно придём ещё раз с друзьями и попробуем новые десерты из летнего меню, о которых нам рассказал бариста.</div>
<p class="title">Шоколадный фондан с шариком ванильного мороженого и ягодами</p>
<p>Конец страницы</p>`;

module.exports = [
  { id: 'display-01', title: 'Меню в строку', description: 'Пункты списка .menu li поставьте в одну строку (display: inline) и задайте им отступ справа 16px.', html: PAGE, css: '.menu li { display: inline; margin-right: 16px; }', require: ['display: inline'] },
  { id: 'display-02', title: 'Метки-плашки', description: 'Меткам .tag — inline-block, ширина 100px, отступ 6px, фон #FFE3B3, выравнивание текста по центру.', html: PAGE, css: '.tag { display: inline-block; width: 100px; padding: 6px; background-color: #FFE3B3; text-align: center; }', require: ['inline-block'] },
  { id: 'display-03', title: 'Убрать блок', description: 'Уберите акцию .promo со страницы так, чтобы освободилось место.', html: PAGE, css: '.promo { display: none; }' },
  { id: 'display-04', title: 'Спрятать, оставив место', description: 'Спрячьте .promo, но так, чтобы место под ним осталось (visibility).', html: PAGE, css: '.promo { visibility: hidden; }' },
  { id: 'display-05', title: 'Ссылка-блок', description: 'Ссылки в меню сделайте блочными (display: block), с отступом 8px, фоном #1C1A1B и цветом #FFE3B3; уберите у списка маркеры (list-style: none) и отступ слева (padding-left: 0).', html: PAGE, css: '.menu { list-style: none; padding-left: 0; }\n.menu a { display: block; padding: 8px; background-color: #1C1A1B; color: #FFE3B3; }' },
  { id: 'display-06', title: 'Обрезать отзыв', description: 'Блоку .review — высота 60px, рамка 1px solid #CCCCCC; всё, что не влезло, обрежьте (overflow: hidden).', html: PAGE, css: '.review { height: 60px; border: 1px solid #CCCCCC; overflow: hidden; }' },
  { id: 'display-07', title: 'Прокрутка', description: 'Блоку .review — высота 70px, ширина 300px и прокрутка, когда текст не помещается (overflow: auto).', html: PAGE, css: '.review { height: 70px; width: 300px; overflow: auto; }' },
  { id: 'display-08', title: 'Многоточие', description: 'Заголовок .title — ширина 260px, одна строка, лишнее обрезать многоточием.', html: PAGE, css: '.title { width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' },
  { id: 'display-09', title: 'Верхнее меню', description: 'Как в образце: у .menu — фон #1C1A1B, отступ 12px, без маркеров и без внешних отступов (margin 0); пункты — inline-block; ссылки — цвет #FFE3B3, без подчёркивания, отступ 6px 12px, inline-block.', html: PAGE, css: '.menu { background-color: #1C1A1B; padding: 12px; list-style: none; margin: 0; }\n.menu li { display: inline-block; }\n.menu a { color: #FFE3B3; text-decoration: none; padding: 6px 12px; display: inline-block; }' },
];
