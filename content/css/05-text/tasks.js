// Тема 5. Текст и шрифты.
const ARTICLE = `
<article class="post">
  <p class="kicker">Рецепт недели</p>
  <h1 class="title">Тыквенный латте</h1>
  <p class="lead">Осенний напиток, который готовится за пять минут.</p>
  <p class="body">Смешайте эспрессо, тыквенное пюре и молоко, добавьте щепотку корицы и мускатного ореха. Взбейте до пены и украсьте сливками.</p>
  <p class="prices"><span class="old">350 ₽</span> <span class="new">290 ₽</span></p>
  <p class="tags"><span class="tag">осень</span> <span class="tag">кофе с молоком</span></p>
</article>`;

module.exports = [
  { id: 'text-01', title: 'Семейство шрифтов', description: 'Для всей статьи (.post) задайте шрифт Georgia, а если его нет — любой с засечками (serif).', html: ARTICLE, css: '.post { font-family: Georgia, serif; }' },
  { id: 'text-02', title: 'Размер и насыщенность', description: 'Заголовок .title — размер 40px, насыщенность 800.', html: ARTICLE, css: '.title { font-size: 40px; font-weight: 800; }' },
  { id: 'text-03', title: 'Высота строки', description: 'Абзацу .body задайте размер 18px и высоту строки 1.7.', html: ARTICLE, css: '.body { font-size: 18px; line-height: 1.7; }' },
  { id: 'text-04', title: 'Подзаголовок прописными', description: 'Абзац .kicker — прописными буквами (text-transform), расстояние между буквами 3px, размер 13px, цвет #CA2851.', html: ARTICLE, css: '.kicker { text-transform: uppercase; letter-spacing: 3px; font-size: 13px; color: #CA2851; }' },
  { id: 'text-05', title: 'Старая и новая цена', description: 'Старую цену .old — зачеркнуть и сделать цветом #999999; новую .new — жирной (700) и размером 24px.', html: ARTICLE, css: '.old { text-decoration: line-through; color: #999999; }\n.new { font-weight: 700; font-size: 24px; }' },
  { id: 'text-06', title: 'Курсив и выравнивание', description: 'Абзац .lead — курсивом, по центру, цветом #8A4B2A.', html: ARTICLE, css: '.lead { font-style: italic; text-align: center; color: #8A4B2A; }' },
  { id: 'text-07', title: 'Красная строка', description: 'Абзацу .body задайте отступ первой строки 2em и выравнивание по ширине (justify).', html: ARTICLE, css: '.body { text-indent: 2em; text-align: justify; }' },
  { id: 'text-08', title: 'Тень у заголовка', description: 'Заголовку .title добавьте тень текста 3px 3px 0 #FFB173 и цвет #1C1A1B.', html: ARTICLE, css: '.title { text-shadow: 3px 3px 0 #FFB173; color: #1C1A1B; }' },
  { id: 'text-09', title: 'Метки без переноса', description: 'Меткам .tag запретите перенос строки (white-space), сделайте их моноширинным шрифтом (monospace) и подчеркните волнистой линией (text-decoration: underline wavy).', html: ARTICLE, css: '.tag { white-space: nowrap; font-family: monospace; text-decoration: underline wavy; }' },
  { id: 'text-10', title: 'Оформить статью', description: 'Как в образце: вся статья — шрифт Georgia, serif, цвет #3B3835; .title — 36px, по центру; .lead — 20px, курсив; .body — высота строки 1.6; .kicker — прописными, по центру, расстояние между буквами 2px.', html: ARTICLE, css: '.post { font-family: Georgia, serif; color: #3B3835; }\n.title { font-size: 36px; text-align: center; }\n.lead { font-size: 20px; font-style: italic; }\n.body { line-height: 1.6; }\n.kicker { text-transform: uppercase; text-align: center; letter-spacing: 2px; }' },
];
