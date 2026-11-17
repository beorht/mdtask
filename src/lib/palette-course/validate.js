// Серверная (авторитетная) проверка заданий предмета «Цвет и палитра». Студент пишет обычный CSS к готовой
// разметке (без переменных). Итоговый цвет каждой роли вычисляет движок каскада CSS-курса
// (src/lib/css-course/cascade.js), затем набор проверяется по правилам теории цвета
// (public/js/color-engine.js). Любая палитра, прошедшая правила, засчитывается.
const { prepareSheets, computeTree, stateEnv, parseSelector, matchesSelector } = require('../css-course/cascade');
const ColorEngine = require('../../../public/js/color-engine');

// Какое ВЫЧИСЛЕННОЕ свойство отвечает роли (студент пишет background/color/border-color).
function computedProp(prop) {
  if (prop === 'color') return 'color';
  if (prop === 'border') return 'border-top-color';
  return 'background-color';
}

/** Вычисленные цвета ролей для (шаблон + base.css + CSS студента). → { roleKey: 'rgba(...)' | null }. */
function colorsFor(template, task, studentCss) {
  const combined = `${template.baseCss}\n${studentCss || ''}`;
  const { doc, entries } = prepareSheets(combined, template.html);
  const env = stateEnv(doc, [], 800, []);
  const tree = computeTree(doc, entries, env);
  const colors = {};
  for (const role of task.roles) {
    const sel = parseSelector(role.selector);
    const node = sel ? doc.elements.find((n) => matchesSelector(n, sel, env)) : null;
    const info = node ? tree.get(node) : null;
    colors[role.key] = info ? info.values[computedProp(role.prop)] : null;
  }
  return colors;
}

/** Проверка: { success, checks:[{type,ok,label,detail}], colors }. */
function checkPalette(template, task, studentCss) {
  const colors = colorsFor(template, task, studentCss);
  const labels = {};
  for (const role of task.roles) labels[role.key] = role.label;
  const { success, checks } = ColorEngine.grade(colors, task.rules, labels);
  return { success, checks, colors };
}

module.exports = { checkPalette, colorsFor, computedProp };
