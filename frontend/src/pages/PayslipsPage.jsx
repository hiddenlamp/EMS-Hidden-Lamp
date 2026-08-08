import React, { useState, useEffect } from 'react';
import api from '../api/client';

const PayslipsPage = () => {
  const [payslips, setPayslips] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal for viewing payslip A4 preview
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fetchPayslips = async () => {
    try {
      const res = await api.get(`/payslips?month=${selectedMonth}&year=${selectedYear}&search=${encodeURIComponent(searchEmployee)}`);
      setPayslips(res.data.payslips || []);
    } catch (err) {
      console.error('Failed to fetch payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchPayslips();
  };

  const handleSendEmail = async (runId, empId) => {
    if (!window.confirm('Send payslip PDF to employee email?')) return;
    try {
      await api.post(`/payroll/${runId}/send-email/${empId}`);
      alert('Payslip email sent successfully!');
    } catch (err) {
      alert('Failed to send email payslip.');
    }
  };

  // Metrics
  const totalPayslipsCount = payslips.length;
  const totalDisbursedNet = payslips.reduce((sum, p) => sum + (p.net_pay || 0), 0);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Payslip Directory</h1>
          <p className="page-description">Search, preview, download, and email monthly payslips across all employees.</p>
        </div>
      </div>

      {/* Top Filter Card (Screenshot 3 Match) */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1.25rem' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
              <i className="fa-solid fa-calendar-days" style={{ color: 'var(--accent)' }}></i> Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
            >
              <option value="">⚡ All Months</option>
              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                <option key={m} value={m}>Month {m}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
              <i className="fa-solid fa-calendar" style={{ color: 'var(--accent)' }}></i> Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
            >
              <option value="">⚡ All Years</option>
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1.5, minWidth: '200px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--accent)' }}></i> Search Employee
            </label>
            <input
              type="text"
              placeholder="Search by Employee Name, Email..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ fontWeight: 600, padding: '0.6rem 1.25rem' }}>
            <i className="fa-solid fa-filter"></i> Apply Filter
          </button>
        </form>
      </div>

      {/* 2 Metric KPI Cards (Screenshot 3 Match) */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '1.5rem' }}>
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalPayslipsCount}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.25rem' }}>Filtered Generated Payslips</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '1.5rem' }}>
            <i className="fa-solid fa-money-bill-wave"></i>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>₹{totalDisbursedNet.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.25rem' }}>Filtered Disbursed Net Salary</div>
          </div>
        </div>
      </div>

      {/* Employee Payslip Directory Table (Screenshot 3 Match) */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Employee Payslip Directory</h2>
        </div>

        {payslips.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No payslips found for selected filters.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>PAYSLIP REF NO</th>
                  <th>PERIOD</th>
                  <th>EMPLOYEE NAME & EMAIL</th>
                  <th style={{ textAlign: 'right' }}>MONTHLY GROSS</th>
                  <th style={{ textAlign: 'right' }}>DEDUCTIONS</th>
                  <th style={{ textAlign: 'right' }}>NET SALARY</th>
                  <th style={{ textAlign: 'center' }}>RUN STATUS</th>
                  <th style={{ textAlign: 'center' }}>EMAIL DELIVERY STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(ps => {
                  const refNo = `HL/PS/${ps.period?.replace('-', '/')}/${String(ps.employee_id || 1).padStart(3, '0')}`;
                  const isDispatched = ps.email_status === 'Dispatched' || ps.email_status === 'Sent';
                  const isSending = ps.email_status === 'Sending...' || ps.email_status === 'Processing';
                  const isFailed = ps.email_status === 'Failed';

                  return (
                    <tr key={ps.id}>
                      <td>
                        <span style={{ background: '#eff6ff', color: '#2563eb', fontFamily: 'monospace', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.82rem' }}>
                          {refNo}
                        </span>
                      </td>
                      <td><strong>{ps.period}</strong></td>
                      <td>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{ps.employee_name}</strong>
                        <br /><small style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-envelope"></i> {ps.user_email || ps.employee_email || (ps.employee_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@hiddenlamp.com')}</small>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>₹{(ps.gross_pay || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>₹{(ps.total_deductions || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb', fontSize: '1rem' }}>₹{(ps.net_pay || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-approved" style={{ background: '#d1fae5', color: '#065f46' }}>Issued</span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {isDispatched ? (
                          <div>
                            <span className="badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 700 }}>
                              <i className="fa-solid fa-circle-check"></i> Email Sent
                            </span>
                            {ps.email_sent_at && (
                              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>{ps.email_sent_at.substring(0, 16)}</div>
                            )}
                          </div>
                        ) : isSending ? (
                          <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 700 }}>
                            <i className="fa-solid fa-spinner fa-spin"></i> Sending...
                          </span>
                        ) : isFailed ? (
                          <span className="badge" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fca5a5', fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 700 }} title={ps.email_error || 'Delivery Error'}>
                            <i className="fa-solid fa-circle-xmark"></i> Failed
                          </span>
                        ) : (
                          <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 600 }}>
                            <i className="fa-regular fa-clock"></i> Not Sent
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => { setSelectedPayslip(ps); setShowPreviewModal(true); }}
                          className="btn btn-sm btn-secondary"
                          style={{ marginRight: '0.3rem', fontSize: '0.78rem' }}
                        >
                          <i className="fa-solid fa-eye"></i> View
                        </button>
                        <a
                          href={`/payroll/${ps.payroll_run_id}/payslip/${ps.employee_id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-primary"
                          style={{ marginRight: '0.3rem', fontSize: '0.78rem' }}
                        >
                          <i className="fa-solid fa-file-pdf"></i> PDF
                        </a>
                        <button
                          onClick={() => handleSendEmail(ps.payroll_run_id, ps.employee_id)}
                          className="btn btn-sm btn-primary"
                          style={{ fontSize: '0.78rem', background: isDispatched ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                        >
                          <i className={`fa-solid ${isDispatched ? 'fa-rotate-right' : 'fa-paper-plane'}`}></i> {isDispatched ? 'Resend' : 'Email'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYSLIP PREVIEW MODAL */}
      {showPreviewModal && selectedPayslip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '750px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Payslip Preview: {selectedPayslip.employee_name} ({selectedPayslip.period})</h2>
              <button onClick={() => setShowPreviewModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <div style={{ background: '#f8fafc', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>HIDDEN LAMP</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Employee Payslip Statement</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb' }}>Period: {selectedPayslip.period}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '1rem' }}>
                <div>Employee Name: <strong>{selectedPayslip.employee_name}</strong></div>
                <div>Net Payable: <strong style={{ color: '#2563eb' }}>₹{(selectedPayslip.net_pay || 0).toLocaleString('en-IN')}</strong></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setShowPreviewModal(false)} className="btn btn-secondary btn-sm">Close</button>
              <a href={`/api/payroll/${selectedPayslip.payroll_run_id}/payslip/${selectedPayslip.employee_id}/pdf`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                <i className="fa-solid fa-download"></i> Download Official PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipsPage;
