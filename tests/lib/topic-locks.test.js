const test = require('node:test');
const assert = require('node:assert');
const db = require('../../src/db');
const { lockState, isLocked } = require('../../src/lib/topic-locks');

const A = { id: 'st-a', role: 'student', group: 'web-1' };
const B = { id: 'st-b', role: 'student', group: 'web-1' };
const T = { id: 'st-t', role: 'student', group: 'TEST' };

test.beforeEach(() => db.__resetForTests());

test('group lock closes the topic for the group, never for TEST', () => {
  db.setTopicOverride({ subject: 'html', topicKey: 'text', scope: 'group', target: 'web-1', mode: 'lock', by: 't' });
  assert.strictEqual(isLocked('html', 'text', A), true);
  assert.strictEqual(isLocked('html', 'text', B), true);
  assert.strictEqual(isLocked('html', 'text', T), false);
  assert.strictEqual(isLocked('html', 'lists', A), false, 'другая тема открыта');
});

test('student allow overrides a group lock (priority student > group)', () => {
  db.setTopicOverride({ subject: 'html', topicKey: 'text', scope: 'group', target: 'web-1', mode: 'lock', by: 't' });
  db.setTopicOverride({ subject: 'html', topicKey: 'text', scope: 'student', target: 'st-a', mode: 'allow', by: 't' });
  const sa = lockState('html', 'text', A);
  assert.strictEqual(sa.locked, false);
  assert.strictEqual(sa.forcedOpen, true);
  assert.strictEqual(isLocked('html', 'text', B), true, 'другой студент группы всё ещё закрыт');
});

test('student lock closes only that student', () => {
  db.setTopicOverride({ subject: 'html', topicKey: 'lists', scope: 'student', target: 'st-b', mode: 'lock', by: 't' });
  assert.strictEqual(isLocked('html', 'lists', B), true);
  assert.strictEqual(isLocked('html', 'lists', A), false);
});

test('deadline: past closes (overdue), future stays open with a deadline', () => {
  db.setTopicOverride({ subject: 'html', topicKey: 'links', scope: 'group', target: 'web-1', mode: 'deadline', deadline: new Date(Date.now() - 1000).toISOString(), by: 't' });
  db.setTopicOverride({ subject: 'html', topicKey: 'media', scope: 'group', target: 'web-1', mode: 'deadline', deadline: new Date(Date.now() + 864e5).toISOString(), by: 't' });
  const past = lockState('html', 'links', A);
  assert.strictEqual(past.locked, true);
  assert.strictEqual(past.overdue, true);
  const future = lockState('html', 'media', A);
  assert.strictEqual(future.locked, false);
  assert.ok(future.deadline && future.deadlineText, 'бейдж дедлайна есть');
});

test('clear reopens the topic', () => {
  db.setTopicOverride({ subject: 'html', topicKey: 'text', scope: 'group', target: 'web-1', mode: 'lock', by: 't' });
  assert.strictEqual(isLocked('html', 'text', A), true);
  db.clearTopicOverride('html', 'text', 'group', 'web-1');
  assert.strictEqual(isLocked('html', 'text', A), false);
});
