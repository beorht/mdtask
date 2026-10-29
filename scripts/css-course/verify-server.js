// Сверка серверной перепроверки CSS (src/lib/css-course/cascade.js) с проверкой в настоящем браузере
// (public/js/css-check.js) на всех заданиях и их вариантах: эталон, пустой CSS, без последнего правила, без каждого
// объявления по очереди, с изменённым цветом. Главное правило: если браузер говорит «совпадает», сервер не должен
// отказать (иначе правильное решение не засчитается). Нужен запущенный сайт и пакет playwright:
//   NODE_PATH=<папка с node_modules/playwright> CHROME=<chrome> node scripts/css-course/verify-server.js [сайт] [тема…]
const { chromium } = require('playwright');
const course = require('../../src/lib/css-course');
const { checkCss } = require('../../src/lib/css-course/cascade');

const site = (process.argv[2] && process.argv[2].startsWith('http')) ? process.argv[2] : 'http://localhost:42521';
const only = process.argv.slice(2).filter((a) => !a.startsWith('http'));

function variants(css) {
  const out = [['ref', css], ['empty', '']];
  // без каждого объявления по очереди
  const decls = [...css.matchAll(/[^{};]+:[^{};]+;?/g)].slice(0, 12);
  decls.forEach((m, i) => out.push([`drop${i}`, css.slice(0, m.index) + css.slice(m.index + m[0].length)]));
  const color = /#[0-9a-fA-F]{6}\b/.exec(css);
  if (color) out.push(['color', css.replace(color[0], '#123456')]);
  return out;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const page = await browser.newPage();
  await page.goto(site + '/login');
  await page.addScriptTag({ url: site + '/js/css-check.js' });
  let total = 0; let falseReject = 0; let lenient = 0;
  for (const topic of course.TOPICS.filter((t) => t.ready && (!only.length || only.includes(t.key)))) {
    for (const task of topic.tasks) {
      for (const [name, css] of variants(task.css)) {
        total += 1;
        const t = { html: task.html, widths: task.widths, states: task.states };
        const b = await page.evaluate(([tk, c, ref]) => window.CssCheck.check(tk, c, ref), [t, css, task.css]);
        const s = checkCss(task, css);
        if (b.ok && !s.ok) { falseReject += 1; console.log(`✗ ОТКАЗ ${task.id}/${name}: ${JSON.stringify(s.diffs[0])}`); }
        if (!b.ok && b.styleProblems > 0 && s.ok) { lenient += 1; if (process.env.VERBOSE) console.log(`~ мягче ${task.id}/${name}: ${JSON.stringify(b.problems[0])}`); }
      }
    }
  }
  await browser.close();
  console.log(JSON.stringify({ variants: total, falseReject, lenientOnStyle: lenient }));
  process.exit(falseReject ? 1 : 0);
})();
