// Проверка содержания предмета «Web-разработка: CSS» в настоящем браузере (Playwright + Chromium):
//   1) эталонный CSS задания проходит проверку (public/js/css-check.js);
//   2) пустой CSS и CSS «без последнего правила» — не проходят (задание не решается случайно);
//   3) эталон выполняет правила задания (require / forbid, src/lib/css-course checkRules).
// Нужен запущенный сайт (по умолчанию http://localhost:42521) и пакет playwright:
//   NODE_PATH=<папка с node_modules/playwright> node scripts/css-course/verify.js [адрес сайта] [тема…]
const { chromium } = require('playwright');
const course = require('../../src/lib/css-course');

const site = (process.argv[2] && process.argv[2].startsWith('http')) ? process.argv[2] : 'http://localhost:42521';
const only = process.argv.slice(2).filter((a) => !a.startsWith('http'));

// CSS без последнего правила (или без последнего объявления, если правило одно).
function weaker(css) {
  const rules = css.match(/[^{}]+\{[^{}]*\}|@[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) || [];
  if (rules.length > 1) return rules.slice(0, -1).join('\n');
  const decls = css.split(';').filter((d) => d.trim() && !d.trim().startsWith('}'));
  if (decls.length > 1) return css.replace(/;[^;]*;?\s*\}\s*$/, '; }');
  return '';
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const page = await browser.newPage();
  await page.goto(site + '/login');
  await page.addScriptTag({ url: site + '/js/css-check.js' });
  let failed = 0;
  let checked = 0;
  for (const topic of course.TOPICS.filter((t) => t.ready && (!only.length || only.includes(t.key)))) {
    for (const task of topic.tasks) {
      checked += 1;
      const t = { html: task.html, widths: task.widths, states: task.states };
      const run = (css) => page.evaluate(([tk, c, ref]) => window.CssCheck.check(tk, c, ref), [t, css, task.css]);
      const errors = [];
      const ref = await run(task.css);
      if (!ref.ok) errors.push('эталон не проходит: ' + JSON.stringify(ref.problems));
      if ((await run('')).ok) errors.push('пустой CSS проходит');
      const weak = weaker(task.css);
      if (weak !== task.css && (await run(weak)).ok) errors.push('проходит и без последнего правила/объявления');
      const rules = course.checkRules(task.css, task);
      if (rules) errors.push('эталон нарушает правила: ' + rules);
      if (errors.length) {
        failed += 1;
        console.log(`✗ ${task.id} ${task.title}\n    ${errors.join('\n    ')}`);
      }
    }
  }
  await browser.close();
  console.log(JSON.stringify({ checked, failed }));
  process.exit(failed ? 1 : 0);
})();
