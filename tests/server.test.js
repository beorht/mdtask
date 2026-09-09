const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../src/server');

test('GET /health returns 200 ok', async () => {
  const app = createApp();
  const res = await request(app).get('/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.text, 'ok');
});
