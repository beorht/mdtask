// Тема 12. Grid: сетка. Оформление уже в разметке (:where — нулевой вес, правила студента побеждают).
const DECOR = `<style>
  :where(body) { font-family: "Open Sans", sans-serif; }
  :where(.cell, .day, .slot, .key, .tile) { background: #FFB173; padding: 8px; }
  :where(.head, .time) { background: #1C1A1B; color: #FFE3B3; padding: 8px; }
  :where(.key) { font: inherit; border: 0; background: #F4F1EC; }
  :where(.op) { background: #FFB173; }
  :where(.eq) { background: #CA2851; color: white; }
  :where(.gallery img) { display: block; width: 100%; }
  :where(.stage) { background: #1F3F66; }
  :where(.badge) { background: #FFE3B3; padding: 10px 20px; }
</style>`;
const CELLS = `${DECOR}<div class="grid">
  <div class="cell c1">1</div><div class="cell c2">2</div><div class="cell c3">3</div>
  <div class="cell c4">4</div><div class="cell c5">5</div><div class="cell c6">6</div>
</div>`;
const GALLERY = `${DECOR}<div class="gallery">
  <img class="big" src="/img/css-course/photo-1.svg" alt=""><img src="/img/css-course/photo-2.svg" alt="">
  <img src="/img/css-course/photo-3.svg" alt=""><img src="/img/css-course/photo-4.svg" alt="">
  <img src="/img/css-course/photo-5.svg" alt=""><img src="/img/css-course/photo-6.svg" alt="">
</div>`;
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
const TIMETABLE = `${DECOR}<div class="timetable">
  <div class="head">Время</div>${DAYS.map((d) => `<div class="head">${d}</div>`).join('')}
  ${['9:00', '10:40', '12:20'].map((t, i) => `<div class="time">${t}</div>${DAYS.map((d, j) => `<div class="slot">${['Веб', 'SQL', 'Python', 'ИБ', 'CSS'][(i + j) % 5]}</div>`).join('')}`).join('\n  ')}
</div>`;
const CALENDAR = `${DECOR}<div class="calendar">
  ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => `<div class="head">${d}</div>`).join('')}
  ${Array.from({ length: 30 }, (_, i) => `<div class="day${i ? '' : ' first'}">${i + 1}</div>`).join('')}
</div>`;
const CALC = `${DECOR}<div class="calc">
  <button class="key">7</button><button class="key">8</button><button class="key">9</button><button class="key op">÷</button>
  <button class="key">4</button><button class="key">5</button><button class="key">6</button><button class="key op">×</button>
  <button class="key">1</button><button class="key">2</button><button class="key">3</button><button class="key eq">=</button>
  <button class="key zero">0</button><button class="key">,</button>
</div>`;
const STAGE = `${DECOR}<div class="stage"><div class="badge">Скоро открытие</div></div>`;
const BENTO = `${DECOR}<div class="bento">
  <div class="tile t1">Кофе</div><div class="tile t2">Десерты</div><div class="tile t3">Завтраки</div>
  <div class="tile t4">Доставка</div><div class="tile t5">Акции</div><div class="tile t6">Контакты</div>
</div>`;
const GRID = ['display: grid'];

module.exports = [
  { id: 'grid-01', title: 'Три колонки', description: 'Блок .grid — сетка из трёх равных колонок (1fr).', html: CELLS, css: '.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }', require: GRID },
  { id: 'grid-02', title: 'Колонки 2 : 1', description: 'Сетка .grid — две колонки в пропорции 2 : 1 (fr).', html: CELLS, css: '.grid { display: grid; grid-template-columns: 2fr 1fr; }', require: [...GRID, 'fr'] },
  { id: 'grid-03', title: 'repeat()', description: 'Сетка .grid — четыре равные колонки через repeat().', html: CELLS, css: '.grid { display: grid; grid-template-columns: repeat(4, 1fr); }', require: [...GRID, 'repeat('] },
  { id: 'grid-04', title: 'Фиксированная и гибкая', description: 'Сетка .grid — первая колонка 180px, вторая занимает всё остальное.', html: CELLS, css: '.grid { display: grid; grid-template-columns: 180px 1fr; }', require: GRID },
  { id: 'grid-05', title: 'Высота строк', description: 'Сетка .grid — три равные колонки, все строки по 90px (grid-auto-rows).', html: CELLS, css: '.grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 90px; }', require: GRID },
  { id: 'grid-06', title: 'Промежутки', description: 'Сетка .grid — три равные колонки, промежутки 16px.', html: CELLS, css: '.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }', require: [...GRID, 'gap'] },
  { id: 'grid-07', title: 'На две колонки', description: 'Сетка — три равные колонки, промежуток 8px; первая ячейка .c1 занимает две колонки.', html: CELLS, css: '.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }\n.c1 { grid-column: span 2; }', require: [...GRID, 'grid-column'] },
  { id: 'grid-08', title: 'На две строки', description: 'Сетка — три равные колонки, строки по 70px, промежуток 8px; ячейка .c2 занимает две строки.', html: CELLS, css: '.grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 70px; gap: 8px; }\n.c2 { grid-row: span 2; }', require: [...GRID, 'grid-row'] },
  { id: 'grid-09', title: 'Во всю ширину', description: 'Сетка — четыре равные колонки, промежуток 8px; ячейка .c5 — на всю ширину сетки (grid-column: 1 / -1).', html: CELLS, css: '.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }\n.c5 { grid-column: 1 / -1; }', require: [...GRID, '-1'] },
  { id: 'grid-10', title: 'Галерея с крупным фото', description: 'Галерея .gallery — три равные колонки, промежуток 8px; первое фото .big занимает 2 колонки и 2 строки; у всех картинок высота 100% и object-fit: cover.', html: GALLERY, css: '.gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }\n.gallery img { height: 100%; object-fit: cover; }\n.big { grid-column: span 2; grid-row: span 2; }', require: GRID },
  { id: 'grid-11', title: 'Расписание', description: 'Расписание .timetable — первая колонка 80px, ещё пять равных (repeat), промежуток 4px.', html: TIMETABLE, css: '.timetable { display: grid; grid-template-columns: 80px repeat(5, 1fr); gap: 4px; }', require: GRID },
  { id: 'grid-12', title: 'Календарь месяца', description: 'Календарь .calendar — семь равных колонок, промежуток 4px, строки по 48px; месяц начинается со среды: первому дню (.first) — grid-column-start: 3.', html: CALENDAR, css: '.calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; grid-auto-rows: 48px; }\n.first { grid-column-start: 3; }', require: GRID },
  { id: 'grid-13', title: 'Клавиатура калькулятора', description: 'Клавиатура .calc — 4 колонки по 64px, строки по 56px, промежуток 6px; «0» (.zero) — на две колонки, «=» (.eq) — на две строки.', html: CALC, css: '.calc { display: grid; grid-template-columns: repeat(4, 64px); grid-auto-rows: 56px; gap: 6px; }\n.zero { grid-column: span 2; }\n.eq { grid-row: span 2; }', require: GRID },
  { id: 'grid-14', title: 'Выравнивание в ячейках', description: 'Сетка .grid — три равные колонки, строки по 100px, промежуток 8px; содержимое каждой ячейки — по центру по горизонтали (justify-items) и прижато к низу (align-items: end).', html: CELLS, css: '.grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 100px; gap: 8px; justify-items: center; align-items: end; }', require: GRID },
  { id: 'grid-15', title: 'Центр одной строкой', description: 'Блок .stage — высота 260px, сетка, и плашка ровно по центру через place-items.', html: STAGE, css: '.stage { height: 260px; display: grid; place-items: center; }', require: [...GRID, 'place-items'] },
  { id: 'grid-16', title: 'Плитки «bento»', description: 'Сетка .bento — 4 равные колонки, строки по 110px, промежуток 10px. .t1 — 2×2; .t4 — на две колонки; .t5 — на две строки.', html: BENTO, css: '.bento { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 110px; gap: 10px; }\n.t1 { grid-column: span 2; grid-row: span 2; }\n.t4 { grid-column: span 2; }\n.t5 { grid-row: span 2; }', require: GRID },
];
