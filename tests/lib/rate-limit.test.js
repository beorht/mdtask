// Ядро ограничителя частоты (src/lib/rate-limit.js): фиксированное окно, лимит и сброс после окна.
const test = require('node:test');
const assert = require('node:assert');
const { hit, identity } = require('../../src/lib/rate-limit');

test('hit: allows up to max, then limits within the window', () => {
  const store = new Map();
  const now = 1000;
  for (let i = 1; i <= 3; i += 1) {
    assert.strictEqual(hit(store, 'k', now, 60000, 3).limited, false, `request ${i}`);
  }
  const over = hit(store, 'k', now, 60000, 3);
  assert.strictEqual(over.limited, true);
  assert.ok(over.retryAfterSec >= 1 && over.retryAfterSec <= 60);
});

test('hit: counter resets after the window passes', () => {
  const store = new Map();
  hit(store, 'k', 1000, 60000, 1);
  assert.strictEqual(hit(store, 'k', 1000, 60000, 1).limited, true, 'blocked within window');
  assert.strictEqual(hit(store, 'k', 1000 + 60000, 60000, 1).limited, false, 'allowed in a new window');
});

test('hit: different keys are counted independently', () => {
  const store = new Map();
  assert.strictEqual(hit(store, 'a', 0, 60000, 1).limited, false);
  assert.strictEqual(hit(store, 'a', 0, 60000, 1).limited, true);
  assert.strictEqual(hit(store, 'b', 0, 60000, 1).limited, false, 'other key has its own budget');
});

test('identity: session user wins over ip', () => {
  assert.strictEqual(identity({ session: { user: { id: 'st-1' } }, ip: '1.2.3.4' }), 'u:st-1');
  assert.strictEqual(identity({ ip: '1.2.3.4' }), 'ip:1.2.3.4');
});
