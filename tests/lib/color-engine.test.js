// Движок теории цвета (public/js/color-engine.js): контраст (WCAG), цветовое расстояние, настроение, схемы и
// проверка правил. Значения сверены с известными эталонами.
const test = require('node:test');
const assert = require('node:assert');
const CE = require('../../public/js/color-engine');

test('parse: hex, rgb, именованные', () => {
  assert.deepStrictEqual(CE.parse('#ffffff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepStrictEqual(CE.parse('#000'), { r: 0, g: 0, b: 0, a: 1 });
  assert.deepStrictEqual(CE.parse('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 });
  assert.strictEqual(CE.parse('rgba(0,0,0,0)').a, 0);
  assert.strictEqual(CE.parse('не цвет'), null);
});

test('contrast: чёрный на белом ≈ 21, белый на белом = 1', () => {
  assert.ok(Math.abs(CE.contrast('#000000', '#ffffff') - 21) < 0.1);
  assert.ok(Math.abs(CE.contrast('#ffffff', '#ffffff') - 1) < 0.001);
});

test('contrast: белый текст на тёмной терракоте читается (≥ 4.5), на нежном коралле — нет', () => {
  assert.ok(CE.contrast('#ffffff', '#b5471f') >= 4.5);
  assert.ok(CE.contrast('#ffffff', '#e8896b') < 4.5);
});

test('deltaE: одинаковые = 0, разные > 0', () => {
  assert.ok(CE.deltaE('#123456', '#123456') < 0.01);
  assert.ok(CE.deltaE('#ffffff', '#000000') > 50);
});

test('temperature: тёплый / холодный / нейтральный', () => {
  assert.strictEqual(CE.temperature('#b5471f'), 'warm');
  assert.strictEqual(CE.temperature('#1e90ff'), 'cool');
  assert.strictEqual(CE.temperature('#808080'), 'neutral');
});

test('grade: правило контраста проходит на читаемой паре и падает на нечитаемой', () => {
  const rules = [{ type: 'contrast', fg: 'title', bg: 'bg', min: 4.5 }];
  const ok = CE.grade({ title: '#222', bg: '#fff' }, rules, { title: 'Заголовок', bg: 'Фон' });
  assert.strictEqual(ok.success, true);
  const bad = CE.grade({ title: '#bbb', bg: '#fff' }, rules, {});
  assert.strictEqual(bad.success, false);
  assert.strictEqual(bad.checks[0].ok, false);
});

test('grade: distinct ловит сливающиеся цвета', () => {
  const rules = [{ type: 'distinct', a: 'card', b: 'page', minDeltaE: 8 }];
  assert.strictEqual(CE.grade({ card: '#ffffff', page: '#fffefe' }, rules).success, false);
  assert.strictEqual(CE.grade({ card: '#ffffff', page: '#dcdce4' }, rules).success, true);
});
