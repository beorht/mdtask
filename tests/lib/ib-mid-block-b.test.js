const test = require('node:test');
const assert = require('node:assert');
const b = require('../../src/lib/ib-mid/block-b');

test('блок B: обе задачи существуют, наборы данных различаются', () => {
  assert.ok(b.isBlockBTask('b1-sales'));
  assert.ok(b.isBlockBTask('b2-logins'));
  assert.ok(!b.isBlockBTask('zzz'));
  for (const id of ['b1-sales', 'b2-logins']) {
    const v = b.view('st-ib-1', id);
    assert.strictEqual(v.datasets.length, 2);
    assert.notStrictEqual(v.datasets[0], v.datasets[1], 'наборы должны отличаться');
    assert.doesNotMatch(v.statement, /```/); // без готового кода-решения
  }
});

test('блок B: правильный вывод (тот же SQL) засчитывается, неправильный — нет', () => {
  for (const id of ['b1-sales', 'b2-logins']) {
    const d = b.datasetsFor('st-ib-7', id);
    // «правильный студент» печатает ровно эталон
    const good = b.check('st-ib-7', id, d.expected);
    assert.ok(good.solved, `${id}: правильный вывод должен засчитаться`);
    // неправильный вывод
    const bad = b.check('st-ib-7', id, ['мусор', 'мусор']);
    assert.ok(!bad.solved, `${id}: неверный вывод не должен засчитаться`);
    assert.ok(bad.hint);
  }
});

test('блок B: подделка ответа на основном наборе проваливает проверочный', () => {
  const id = 'b1-sales';
  const d = b.datasetsFor('st-ib-9', id);
  // студент захардкодил вывод первого набора — на втором не совпадёт
  const res = b.check('st-ib-9', id, [d.expected[0], d.expected[0]]);
  // если наборы дают одинаковый вывод (маловероятно), пропускаем
  if (d.expected[0] !== d.expected[1]) {
    assert.ok(!res.solved, 'хардкод первого набора не должен проходить');
  }
});

test('блок B: B1 эталон непустой и в нужном формате', () => {
  const d = b.datasetsFor('st-ib-3', 'b1-sales');
  assert.match(d.expected[0], /^[^:\n]+: \d+$/m); // строки «категория: число»
});
