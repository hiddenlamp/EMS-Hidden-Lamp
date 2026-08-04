import React, { useState, useEffect } from 'react';
import api from '../api/client';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit-logs');
        setLogs(res.data.logs || []);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Security & Activity Audit Logs</h1>
          <p className="page-description">Immutably track all system actions, user logins, payroll approvals, and employee updates.</p>
        </div>
      </div>

      <div className="card">
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No audit logs recorded yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor Email</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Metadata Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>{log.created_at}</td>
                    <td><strong>{log.user_email}</strong></td>
                    <td>
                      <span className="badge badge-approved" style={{ background: '#dbeafe', color: '#1e40af' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.target_type} #{log.target_id || ''}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>{log.metadata}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
