// Тема 14. Псевдоклассы и псевдоэлементы. states — в каких состояниях проверяется (наведение, фокус, отметка).
const PAGE = `
<nav class="links"><a href="#" class="active">Главная</a> <a href="#">Меню</a> <a href="#">Контакты</a></nav>
<p><button class="btn">Заказать</button> <input class="field" placeholder="Ваше имя"></p>
<ul class="list"><li>Эспрессо</li><li>Капучино</li><li>Латте</li><li>Раф</li><li>Какао</li><li>Чай</li></ul>
<ul class="todo">
  <li><input type="checkbox" id="t1" class="check"><label for="t1">Купить зёрна</label></li>
  <li><input type="checkbox" id="t2" class="check"><label for="t2">Позвонить поставщику</label></li>
</ul>
<p class="story">Однажды утром в нашем кафе появился новый гость. Он заказал тыквенный латте и остался на весь день, читая книгу у окна.</p>
<p><a class="more" href="#">Читать дальше</a></p>`;

module.exports = [
  { id: 'pseudo-01', title: 'Наведение на кнопку', description: 'Кнопка .btn — фон #CA2851, белый текст, без рамки, отступ 8px 16px; при наведении фон #1C1A1B.', html: PAGE, css: '.btn { background-color: #CA2851; color: white; border: 0; padding: 8px 16px; }\n.btn:hover { background-color: #1C1A1B; }', states: [{ selector: '.btn', state: 'hover' }], require: [':hover'] },
  { id: 'pseudo-02', title: 'Поле в фокусе', description: 'Поле .field — рамка 2px solid #CCCCCC, отступ 6px; в фокусе — рамка цвета #CA2851 и без контура (outline: none).', html: PAGE, css: '.field { border: 2px solid #CCCCCC; padding: 6px; }\n.field:focus { border-color: #CA2851; outline: none; }', states: [{ selector: '.field', state: 'focus' }], require: [':focus'] },
  { id: 'pseudo-03', title: 'Первый и последний', description: 'В списке .list: первый пункт — жирный, последний — цветом #CA2851.', html: PAGE, css: '.list li:first-child { font-weight: bold; }\n.list li:last-child { color: #CA2851; }', require: [':first-child', ':last-child'] },
  { id: 'pseudo-04', title: 'Зебра', description: 'Нечётные пункты .list — фон #FFF3E6, чётные — #DDE8F5 (nth-child).', html: PAGE, css: '.list li:nth-child(odd) { background-color: #FFF3E6; }\n.list li:nth-child(even) { background-color: #DDE8F5; }', require: [':nth-child('] },
  { id: 'pseudo-05', title: 'Каждый третий', description: 'Каждый третий пункт .list (3n) — фон #FFB173 и жирный.', html: PAGE, css: '.list li:nth-child(3n) { background-color: #FFB173; font-weight: bold; }', require: [':nth-child('] },
  { id: 'pseudo-06', title: 'Все, кроме активной', description: 'Ссылки .links: все, кроме .active, — цветом #888888 (:not); активная — цветом #CA2851 и жирная.', html: PAGE, css: '.links a:not(.active) { color: #888888; }\n.links .active { color: #CA2851; font-weight: bold; }', require: [':not('] },
  { id: 'pseudo-07', title: 'Отмеченное дело', description: 'Когда флажок .check отмечен, подпись рядом (+ label) — зачёркнутая и цветом #2E7D4F.', html: PAGE, css: '.check:checked + label { text-decoration: line-through; color: #2E7D4F; }', states: [{ selector: '#t1', state: 'checked' }], require: [':checked'] },
  { id: 'pseudo-08', title: 'Галочки перед пунктами', description: 'Перед каждым пунктом .list добавьте «✓ » через ::before, цветом #2E7D4F; маркеры списка уберите (list-style: none).', html: PAGE, css: '.list { list-style: none; }\n.list li::before { content: "✓ "; color: #2E7D4F; }', require: ['::before', 'content'] },
  { id: 'pseudo-09', title: 'Стрелка после ссылки', description: 'После ссылки .more добавьте « →» через ::after; у самой ссылки — цвет #CA2851 и без подчёркивания.', html: PAGE, css: '.more { color: #CA2851; text-decoration: none; }\n.more::after { content: " →"; }', require: ['::after'] },
  { id: 'pseudo-10', title: 'Буквица', description: 'Первая буква абзаца .story — размер 52px, float: left, line-height 1, отступ справа 6px, цвет #CA2851.', html: PAGE, css: '.story::first-letter { font-size: 52px; float: left; line-height: 1; margin-right: 6px; color: #CA2851; }', require: ['::first-letter'] },
];
