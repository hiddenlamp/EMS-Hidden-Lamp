const session = require('express-session');
const db = require('../db/database');

class SqliteSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.db = options.db || db;
  }

  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT sess, expired FROM sessions WHERE sid = ?').get(sid);
      if (!row) {
        return callback(null, null);
      }
      if (row.expired < Date.now()) {
        this.destroy(sid, () => {});
        return callback(null, null);
      }
      const sess = JSON.parse(row.sess);
      callback(null, sess);
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sess, callback) {
    try {
      const maxAge = (sess.cookie && sess.cookie.maxAge) ? sess.cookie.maxAge : 86400000;
      const expired = Date.now() + maxAge;
      const sessStr = JSON.stringify(sess);

      this.db.prepare(`
        INSERT INTO sessions (sid, sess, expired)
        VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired
      `).run(sid, sessStr, expired);

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  touch(sid, sess, callback) {
    this.set(sid, sess, callback);
  }
}

module.exports = SqliteSessionStore;
