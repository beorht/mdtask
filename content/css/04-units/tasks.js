// Тема 4. Цвета и единицы измерения.
const SWATCHES = `
<div class="palette">
  <div class="swatch s1">Коралл</div>
  <div class="swatch s2">Абрикос</div>
  <div class="swatch s3">Небо</div>
  <div class="swatch s4">Ночь</div>
</div>`;
const HERO = `
<section class="hero">
  <div class="overlay">
    <h1>Кофейня у парка</h1>
    <p class="small">Открыто с 8:00 до 22:00</p>
  </div>
</section>
<div class="track"><div class="bar">Заполнено</div></div>
<p class="ghost">Скоро: летняя веранда</p>`;

module.exports = [
  { id: 'units-01', title: 'Цвет в hex', description: 'Первой плашке (.s1) задайте фон #FF6766, второй (.s2) — фон #FFB173.', html: SWATCHES, css: '.s1 { background-color: #FF6766; }\n.s2 { background-color: #FFB173; }' },
  { id: 'units-02', title: 'Цвет в rgb', description: 'Плашке .s4 задайте фон rgb(28, 26, 27) и цвет текста rgb(255, 227, 179).', html: SWATCHES, css: '.s4 { background-color: rgb(28, 26, 27); color: rgb(255, 227, 179); }', require: ['rgb('] },
  { id: 'units-03', title: 'Цвет в hsl', description: 'Плашке .s3 задайте фон hsl(205, 70%, 55%) и белый текст.', html: SWATCHES, css: '.s3 { background-color: hsl(205, 70%, 55%); color: white; }', require: ['hsl('] },
  { id: 'units-04', title: 'Полупрозрачный фон', description: 'Секции .hero — фон #CA2851; блоку .overlay — полупрозрачный чёрный фон rgba(0, 0, 0, 0.5) и белый текст (текст остаётся чётким).', html: HERO, css: '.hero { background-color: #CA2851; }\n.overlay { background-color: rgba(0, 0, 0, 0.5); color: white; }' },
  { id: 'units-05', title: 'opacity', description: 'Абзац .ghost сделайте целиком полупрозрачным: opacity 0.4.', html: HERO, css: '.ghost { opacity: 0.4; }' },
  { id: 'units-06', title: 'Ширина в процентах', description: 'Полоса .track — фон #EEEEEE; заполненная часть .bar — ширина 65% от .track, фон #2E7D4F, белый текст.', html: HERO, css: '.track { background-color: #EEEEEE; }\n.bar { width: 65%; background-color: #2E7D4F; color: white; }', require: ['%'] },
  { id: 'units-07', title: 'em от родителя', description: 'Блоку .overlay задайте размер шрифта 20px, а абзацу .small — 0.75em (получится 15px).', html: HERO, css: '.overlay { font-size: 20px; }\n.small { font-size: 0.75em; }', require: ['em'] },
  { id: 'units-08', title: 'rem от корня', description: 'Заголовку h1 задайте размер 2.5rem, абзацу .small — 1.125rem (в rem, от размера шрифта html — 16px).', html: HERO, css: 'h1 { font-size: 2.5rem; }\n.small { font-size: 1.125rem; }', require: ['rem'] },
  { id: 'units-09', title: 'Заставка на полэкрана', description: 'Секции .hero задайте высоту 50vh (половина высоты окна) и фон #1F3F66, текст — белым.', html: HERO, css: '.hero { height: 50vh; background-color: #1F3F66; color: white; }', require: ['vh'] },
  { id: 'units-10', title: 'Палитра', description: 'Все плашки: внутренний отступ 1em и ширина 50%. Цвета фона: .s1 — #FF6766, .s2 — rgb(255, 177, 115), .s3 — hsl(205, 70%, 55%), .s4 — #1C1A1B с текстом #FFE3B3.', html: SWATCHES, css: '.swatch { padding: 1em; width: 50%; }\n.s1 { background-color: #FF6766; }\n.s2 { background-color: rgb(255, 177, 115); }\n.s3 { background-color: hsl(205, 70%, 55%); }\n.s4 { background-color: #1C1A1B; color: #FFE3B3; }' },
];
