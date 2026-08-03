import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { ShieldCheck, User, Clock, Activity } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Security & Activity Audit Logs</h1>
        <p className="text-sm text-slate-500">Immutably track all system actions, user logins, payroll approvals, and employee updates.</p>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor Email</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Metadata Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 text-xs font-mono text-slate-500">{log.created_at}</td>
                  <td className="p-4 font-bold text-slate-900">{log.user_email}</td>
                  <td className="p-4">
                    <span className="font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-xs">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-600">{log.target_type} #{log.target_id || ''}</td>
                  <td className="p-4 text-xs font-mono text-slate-500 max-w-xs truncate">{log.metadata}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
