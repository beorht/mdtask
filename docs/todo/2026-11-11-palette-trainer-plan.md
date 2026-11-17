# Тренажёр «Цвет и палитра» — план

**Дата:** 2026-11-11. **Статус:** все 7 тем готовы (52 задачи, 6 шаблонов). Локально, не выложено.

## Все 7 тем (2026-11-11)
Шаблоны (body-фрагмент + base.css без цветов + свои нейтральные плейсхолдеры, НЕ скриншоты из `templates/colors/`):
1. **Контраст** — `product-card` (+ SVG `mug.svg`), 8 задач (contrast/accent).
2. **Поверхности и глубина** — `card-grid`, 8 задач (distinct + contrast).
3. **Цветовой круг и гармония** — `hero-minimal` (цветные блоки), 8 задач (harmony any/analogous/complementary/mono/triadic).
4. **Акцент и 60-30-10** — `feature-cta`, 8 задач (accent + harmony mono + temperature).
5. **Тёплое/холодное** — `mood-landing`, 8 задач (temperature warm/cool + harmony).
6. **Страница целиком** — `landing`, 6 задач (всё вместе: contrast+distinct+accent+temperature).
7. **По образцу/бренд** — режим `match`: бренд-гайд (палитра с hex) показан на странице (клик копирует код),
   студент точно воспроизводит фирменные цвета; 6 задач на шаблонах product-card/card-grid/feature-cta/hero-minimal/landing.
   `brand: [{label,hex}]` в задаче → проброшен в `taskView` → отрисован в `task.ejs`; стили `.palette-brand*`.
Чекер `scripts/palette-course/check.js`: все 52 эталона проходят, пустой CSS падает. Полный тест-набор 449/449.
Проверено в браузере (Playwright): темы 1/3/6/7 рендерятся и грейдятся корректно, живые пипетки/проверки/бренд-гайд работают.

## Сделано (инфраструктура, 2026-11-11)
Движок `public/js/color-engine.js` (parse/contrast WCAG/deltaE/hsl/temperature/scheme/grade) + экспорт
`prepareSheets/computeTree/stateEnv` из `src/lib/css-course/cascade.js`. Проверка `src/lib/palette-course/validate.js`
(цвета ролей из каскада → grade). `src/lib/palette-course/{index,theory,admin}.js`, БД `src/db/palette-course.js`
(`palette_progress`/`palette_attempts`), схема, провязка в `src/db/index.js`. Маршрут `src/routes/palette-course.js`,
виды `src/views/palette-course/{index,theory,task}.ejs`, клиент `public/js/palette-course.js` (пипетки по ролям,
живой предпросмотр в iframe `sandbox=allow-same-origin`, живые проверки, «Проверить» на сервере), стили в
`public/css/components.css`. Карточка 🎨 (`student-home.js`), сайдбар (`sidebar.js`), реестр блокировок
(`subject-topics.js`), админка `/admin/palette` (`routes/admin-palette-course.js` + 2 вида + пункт меню).
Контент: `content/palette/topics.json` (6 тем), шаблон `templates/product-card.{html,base.css}` + свой SVG
`public/img/palette/product-card/mug.svg`, тема 1 `01_contrast/{theory.md,tasks.js}` (4 задачи). Чекер
`scripts/palette-course/check.js`. Тесты `tests/lib/color-engine.test.js` + `tests/routes/palette-course.test.js`;
весь набор 449/449. Проверено в браузере (Playwright, светлая тема): предпросмотр, пипетки, живые проверки,
«Проверить» → «Решено!» работают.

## Осталось
По желанию: «Выбрать 4 студентов» в админке. Затем выложить (архив кода), включить группам (сейчас только
TEST), завести под `/admin/locks`.

Отдельный предмет `/subjects/palette` «Тренажёр: цвет и палитра». Студенту дают **готовую свёрстанную
страницу** (реальные классы/id уже прописаны, картинки и шрифты — локальные), но **без цвета**.
Студент сам пишет **настоящий CSS** к этим классам/id (без CSS-переменных), подбирая цвет каждому
объекту, помогает **color picker**. Живой предпросмотр справа. Проверка — **по правилам теории цвета**
на *вычисленных* цветах (контраст WCAG, гармония/схемы круга, роли 60-30-10, тёплое/холодное,
соответствие настроению макета), а не по совпадению с эталоном: принимаем любую подходящую палитру.

Решения с пользователем 2026-11-11: проверка = правила теории; студент пишет реальный CSS к готовой
разметке **без переменных**; инструмент = color picker; шаблоны — по образцу скриншотов в
`templates/colors/`; отдельный предмет; сначала только **TEST** (`PALETTE_GROUPS=[]`).

## 1. Как устроено задание

Одна задача = один **шаблон страницы** (или его секция) + набор **ролей** (какие элементы важны для
цвета) + **правила** проверки.

- **Шаблон** — готовая разметка `content/palette/templates/<key>.html` с семантическими классами/id
  (`.site-header`, `.hero`, `.hero__title`, `.btn-primary`, `.product-card`, `.price`, `.footer`…) и
  **базовый стиль** `<key>.base.css` (раскладка, отступы, типографика — **без цветов**: фон/текст
  нейтрально-серые, чтобы «нераскрашенность» была видна). Цвет студент добавляет своим CSS.
- **Картинки** — локальные, в `public/img/palette/<key>/`. Скриншоты из `templates/colors/` —
  **только референс стиля, их самих не публикуем** (чужие дизайны). Шаблоны — оригинальные
  упрощённые пересборки по мотивам, с собственными лёгкими плейсхолдерами (SVG/силуэты товаров,
  геометрия), которые нейтрально-серые и «принимают» цвет от фона. Это и правильнее по авторству, и
  работает офлайн (классовые ПК без интернета — тест проверяет отсутствие внешних хостов).
- **Шрифты** — через уже существующий офлайн-вендор `scripts/vendor/fonts.py` (@fontsource,
  Cyrillic+Latin). Нужен дисплейный шрифт под шаблон — добавляем тем же способом, ничего с CDN.
- **Роли** — `roles: [{ key, selector, prop:'background|color|border', label }]`, напр.
  `{ key:'heroBg', selector:'.hero', prop:'background', label:'Фон героя' }`.
- **Редактор CSS** можно пред-заполнить «скелетом» нужных селекторов с пустыми значениями цвета,
  чтобы студент **дописывал только цвет** (`.hero { background: ; } .hero__title { color: ; } …`),
  либо оставить пустым для продвинутых тем (флаг `skeleton` в задаче).
- **Правила** — на *ролях* (их вычисленный цвет):
  - `{ type:'contrast', fg, bg, min }` — читаемость (WCAG 4.5 / 3 крупный / 7 AAA).
  - `{ type:'distinct', a, b, minDeltaE }` — карточка/поверхность отличима от фона.
  - `{ type:'harmony', roles:[...], scheme:'analogous|complementary|triadic|mono|any', tol }`.
  - `{ type:'accent', accent, bg, minContrast, maxHues }` — акцент заметен и один.
  - `{ type:'temperature', roles:[...], want:'warm|cool' }` — настроение макета.
  - `{ type:'match', role, target, maxDeltaE }` — опц., «попади в фирменный цвет» по образцу.

## 2. Проверка (переиспользуем движок CSS-курса)

Студент пишет CSS → цвет каждого элемента надо *вычислить*, затем применить правила теории.

- **Сервер (авторитетно):** `src/lib/css-course/cascade.js` уже парсит CSS и считает видимые стили с
  учётом селекторов/специфичности/`@media`. Переиспользуем его: прогоняем (шаблон HTML + base.css +
  CSS студента) и берём вычисленные `background/color/border` каждой роли → отдаём их в
  `color-engine.grade(roles, rules)`. Эталонный вывод не нужен — правила проверяют принципы.
- **Браузер (предпросмотр + мгновенная подсказка):** рендер шаблона со стилем студента в
  изолированном iframe (как в CSS-курсе), `getComputedStyle` по ролям → тот же `color-engine` для
  живой подсказки до отправки. Авторитет — всё равно сервер.
- **`public/js/color-engine.js` (UMD, браузер + Node):** parse hex/rgb/hsl, `relativeLuminance`,
  `contrastRatio`, `rgb→lab`+`deltaE`, `hueDistance`, `schemeOf(hues)`, `temperature(hue)`,
  `grade(roles, rules)` → по каждому правилу pass/fail + русское объяснение
  («текст не читается, контраст 2.1 — нужно ≥ 4.5», «акцент сливается с фоном»,
  «палитра распадается — три несвязанных оттенка», «для этого макета ждём тёплую гамму»).
  success — когда прошли все обязательные правила.

## 3. Шаблоны и темы (прогрессия) `content/palette/topics.json`

Каждая тема: N.1 теория (`theory.md` — круг, контраст, 60-30-10; живые свотчи через
`public/js/palette-examples.js`) + N.2 практика на своём шаблоне. Теория открывает практику;
следующая тема — когда решены все задачи предыдущей (TEST: всё открыто). Инструмент — color picker
во всех темах; сложность растёт за счёт числа ролей и набора правил.

Стартовый набор шаблонов (оригинальные пересборки по мотивам референсов):
1. **Карточка товара** (из ecommerce) — мало ролей, фокус **контраст и читаемость**.
2. **Секция «герой»** — фон/заголовок/подзаголовок/кнопка: контраст + **заметный акцент**.
3. **Минимал-страница** (Japan UI) — холодная база + один акцент: **роль акцента, 60-30-10**.
4. **Витрина карточек** (LittleNest/Hasfarm) — **поверхности и глубина**, гармония фон/карточка.
5. **Тёплый природный лендинг** (Hasfarm) — **тёплая гамма**, аналоговая/комплементарная схема.
6. **Болд-блоки** (Urban Wild Studio) — **цветовые блоки и контрастные пары**, триада.
7. **Собери страницу целиком** — полный лендинг, все правила вместе.
8. *(опц.)* **По образцу/бренд** — режим `match` + правила.

~8–12 задач на тему (варианты шаблона: другой товар/секция/набор ролей, разные требования правил).

## 4. Инфраструктура (по образцу Emmet/Linux/Bash/CSS)

- `src/lib/palette-course/index.js` — `SUBJECT_KEY='palette'`, `PALETTE_GROUPS=[]`, `canSeeSubject`,
  `topicsForStudent` (c `topicLocks.lockState` → `adminLocked/deadline(Text)/overdue/lockReason`,
  forcedOpen), `checkPractice`, `recordEvent`.
- `src/lib/palette-course/{rules.js (grade через color-engine), validate.js (сервер-ре-грейд через
  cascade+engine), theory.js, admin.js}`.
- `src/routes/palette-course.js` — смонтировать до `student`; 423 на locked-входе; API
  `/subjects/palette/api/<topic>/{me,events,check}`; закрытие во время экзамена `blockDuringExam`.
- `src/views/palette-course/{index,theory,practice}.ejs`; `public/js/palette-course.js`
  (рендер шаблона в iframe, CSS-редактор CodeMirror, **color picker** `<input type=color>` + клик по
  роли → вставка/правка hex, живой предпросмотр и подсказка через color-engine, POST на сервер);
  `public/css/palette-course.css`. Переиспользуем CSS-редактор/монитор набора из CSS-курса.
- БД: `palette_progress` (item `<topic>:theory` или id, CSS студента + stats JSON) и `palette_events`
  в `schema.sql`; `src/db/palette-course.js`, провязать в `src/db/index.js`.
- Реестр `src/lib/subject-topics.js` — запись `palette` (для `/admin/locks` + фильтр по группе).
- `src/lib/student-home.js` — карточка 🎨 (gated `canSeeSubject`); `src/lib/sidebar.js` — nav.
- Админка `/admin/palette` (`src/routes/admin-palette-course.js`, `src/lib/palette-course/admin.js`):
  матрица student×тема, карточка студента с его CSS/палитрой и логом, сигналы, «Сбросить»,
  «Выбрать 4 студентов»; пункт сайдбара `src/views/admin/partials/sidebar.ejs`.

## 5. Проверка/сборка контента
- Тяжёлого build нет. Чекер решаемости `scripts/palette-course/check.js`: для каждой задачи эталонная
  палитра `sample` (CSS) проходит все правила (success) через cascade+engine, а «плохая» (всё одним
  цветом/низкий контраст) — нет. Гоняется и из тестов.
- Тесты: `tests/lib/color-engine.test.js` (контраст/ΔE/схемы на известных значениях),
  `tests/routes/palette-course.test.js` (доступ, порядок, API check success/mismatch, 423 lock,
  админ, TEST-доступ). `db.__resetForTests()` — неконфликтные id.

## 6. Деплой
Как у всех новых предметов — локально, не выкладывать, пока работают студенты; включение группам
позже; завести под `/admin/locks`. Архив по запросу «дай скрипт обновы»/«собери архив».

## Открытые мелочи (решу по умолчанию, если не поправят)
- Плейсхолдер-картинки — свои нейтрально-серые SVG (не скриншоты). 
- Редактор по умолчанию с «скелетом» селекторов и пустым цветом (студент дописывает только цвет);
  в поздних темах — пустой редактор.
- Шрифты — из уже вендорённых; если шаблону нужен дисплейный — добавлю через `fonts.py`.
