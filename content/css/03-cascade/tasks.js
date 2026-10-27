// Тема 3. Каскад, наследование, специфичность. В разметке части заданий уже есть <style>, подключённый ПОСЛЕ
// CSS студента: при равном весе он побеждает, поэтому нужен более специфичный селектор; !important запрещён.
const ARTICLE = `
<main id="main">
  <article class="post">
    <h2 class="title">Как мы выбираем кофе</h2>
    <p class="text">Зерно привозят от небольших ферм.</p>
    <p class="text lead">Обжариваем сами — раз в неделю.</p>
    <p>Заходите на дегустацию по субботам.</p>
    <button class="btn">Записаться</button>
  </article>
</main>`;
const NO_IMPORTANT = ['!important'];

module.exports = [
  {
    id: 'cascade-01', title: 'Наследование от body',
    description: 'Задайте один раз у body цвет текста #3B3835 и размер шрифта 18px — заголовок и абзацы получат их по наследству (у h2 размер свой, он не изменится).',
    html: ARTICLE, css: 'body { color: #3B3835; font-size: 18px; }', forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-02', title: 'Кнопка не наследует шрифт',
    description: 'У body задан размер 20px, но кнопка его не наследует. Сделайте так, чтобы шрифт кнопки (font) брался у родителя: значение inherit.',
    html: `<style>body { font-size: 20px; }</style>${ARTICLE}`, css: '.btn { font: inherit; }', require: ['inherit'], forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-03', title: 'Перебить правило по тегу',
    description: 'В разметке есть стиль p { color: #888888 } — он подключён после вашего CSS. Сделайте абзацы статьи цветом #1F3F66 более точным селектором.',
    html: `<style>p { color: #888888; }</style>${ARTICLE}`, css: '.post p { color: #1F3F66; }', forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-04', title: 'Перебить правило по классу',
    description: 'В разметке: .text { color: #888888 }. Абзацы с классом text сделайте цветом #CA2851, остальные не трогайте.',
    html: `<style>.text { color: #888888; }</style>${ARTICLE}`, css: '.post .text { color: #CA2851; }', forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-05', title: 'Два класса сильнее одного',
    description: 'В разметке: .post .text { font-size: 14px }. Абзацу, у которого есть и класс text, и класс lead, задайте размер 22px.',
    html: `<style>.post .text { font-size: 14px; }</style>${ARTICLE}`, css: '.post .text.lead { font-size: 22px; }', forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-06', title: 'Против id',
    description: 'В разметке: #main .title { color: #888888 }. Сделайте заголовок цветом #2E7D4F — селектор должен весить больше.',
    html: `<style>#main .title { color: #888888; }</style>${ARTICLE}`, css: '#main h2.title { color: #2E7D4F; }', forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-07', title: 'Вернуть цвет родителя',
    description: 'В разметке: .post * { color: #CA2851 }. Задайте article цвет #1F3F66, а абзацам с классом text — inherit, чтобы они взяли цвет article.',
    html: `<style>.post * { color: #CA2851; }</style>${ARTICLE}`, css: '.post { color: #1F3F66; }\n.post .text { color: inherit; }', require: ['inherit'], forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-08', title: 'Рамка не наследуется',
    description: 'Задайте article рамку 2px solid #FFB173, внутренний отступ 12px и цвет текста #8A4B2A. Убедитесь: цвет перешёл к абзацам, а рамки у них нет.',
    html: ARTICLE, css: '.post { border: 2px solid #FFB173; padding: 12px; color: #8A4B2A; }', forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-09', title: 'Порядок при равном весе',
    description: 'Сначала сделайте все абзацы .text цветом #555555, а следующим правилом с тем же весом — абзац .lead цветом #CA2851 и жирным.',
    html: ARTICLE, css: '.text { color: #555555; }\n.lead { color: #CA2851; font-weight: bold; }', forbid: NO_IMPORTANT,
  },
  {
    id: 'cascade-10', title: 'Чужая тема оформления',
    description: 'В разметке — чужие стили (откройте вкладку «Разметка»). Сделайте как в образце: фон статьи #FFF8EE, заголовок #CA2851, абзацы .text — #3B3835, кнопка — фон #1C1A1B и цвет #FFE3B3. Без !important.',
    html: `<style>
  #main article { background: #EEEEEE; }
  #main .title { color: #888888; }
  .post .text { color: #AAAAAA; }
  .post .btn { background: #CCCCCC; color: #000000; }
</style>${ARTICLE}`,
    css: '#main .post { background: #FFF8EE; }\n#main h2.title { color: #CA2851; }\n.post p.text { color: #3B3835; }\n.post button.btn { background: #1C1A1B; color: #FFE3B3; }',
    forbid: NO_IMPORTANT,
  },
];
