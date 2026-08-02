const db = require('../db/database');

function logAction(userEmail, action, entity, entityId, details) {
  try {
    const insert = db.prepare('INSERT INTO audit_logs (user_email, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)');
    insert.run(
      userEmail || 'system',
      action,
      entity,
      entityId || null,
      typeof details === 'object' ? JSON.stringify(details) : (details || '')
    );
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

module.exports = { logAction };
