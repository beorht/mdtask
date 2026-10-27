// express-session store on the app's SQLite DB (table `sessions`), so a server restart keeps
// everyone logged in. No extra npm package: classroom servers have no internet.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const db = require('../db');

const SESSION_MAX_AGE = 12 * 60 * 60 * 1000; // 12 h, renewed on every request (rolling)
const PURGE_EVERY = 60 * 60 * 1000;

class SqliteStore extends session.Store {
  constructor() {
    super();
    db.purgeExpiredSessions(Date.now());
    this.timer = setInterval(() => db.purgeExpiredSessions(Date.now()), PURGE_EVERY);
    this.timer.unref();
  }

  expiresAt(sess) {
    const expires = sess && sess.cookie && sess.cookie.expires;
    return expires ? new Date(expires).getTime() : Date.now() + SESSION_MAX_AGE;
  }

  get(sid, cb) {
    try {
      const raw = db.getSession(sid, Date.now());
      cb(null, raw ? JSON.parse(raw) : null);
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      db.setSession(sid, JSON.stringify(sess), this.expiresAt(sess));
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      db.touchSession(sid, this.expiresAt(sess));
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      db.destroySession(sid);
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }
}

// SESSION_SECRET, else a random secret kept next to the DB (data/session-secret) so it survives
// restarts; an in-memory DB (tests) gets a per-process one.
function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');
  if (dbPath === ':memory:') return sessionSecret.memory || (sessionSecret.memory = crypto.randomBytes(32).toString('hex'));
  const file = path.join(path.dirname(dbPath), 'session-secret');
  try {
    const saved = fs.readFileSync(file, 'utf-8').trim();
    if (saved) return saved;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(file, secret + '\n', { mode: 0o600 });
  return secret;
}

let store = null;
function sharedStore() {
  return store || (store = new SqliteStore());
}

module.exports = { SqliteStore, sharedStore, sessionSecret, SESSION_MAX_AGE };
