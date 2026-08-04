import React, { useState, useEffect } from 'react';
import api from '../api/client';

const PayslipsPage = () => {
  const [payslips, setPayslips] = useState([]);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [years, setYears] = useState([]);
  const [monthNames, setMonthNames] = useState([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchPayslips = async () => {
    try {
      const res = await api.get(`/payslips?month=${selectedMonth}&year=${selectedYear}&search=${search}`);
      setPayslips(res.data.payslips || []);
      setTotalGenerated(res.data.totalGenerated || 0);
      setTotalAmount(res.data.totalAmount || 0);
      setYears(res.data.years || []);
      setMonthNames(res.data.monthNames || []);
    } catch (err) {
      console.error('Failed to fetch payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [selectedMonth, selectedYear, search]);

  const openPayslipModal = async (ps) => {
    try {
      const res = await api.get(`/payslips/${ps.id}`);
      setSelectedPayslip(res.data.payslip);
      setBreakdown(res.data.breakdown);
      setShowModal(true);
    } catch (err) {
      alert('Failed to load payslip preview.');
    }
  };

  const handleSendEmail = async (ps) => {
    try {
      await api.post(`/payroll/${ps.payroll_run_id}/send-email/${ps.employee_id}`);
      alert(`Payslip email dispatched successfully!`);
    } catch (err) {
      alert('Failed to send email.');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Payslip Directory</h1>
          <p className="page-description">Filter payslips by Month and Year, search employees, view details, download PDF, or send email notifications.</p>
        </div>
      </div>

      {/* MONTH & YEAR FILTER BAR */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
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
              {monthNames.map(m => (
                <option key={m.num} value={m.num}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '130px' }}>
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
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1.5, minWidth: '220px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--accent)' }}></i> Search Employee
            </label>
            <input
              type="text"
              placeholder="Search by Employee Name, Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
            />
          </div>

          {(selectedMonth || selectedYear || search) && (
            <button
              onClick={() => { setSelectedMonth(''); setSelectedYear(''); setSearch(''); }}
              className="btn btn-secondary"
              style={{ fontSize: '0.88rem', fontWeight: 600 }}
            >
              ✖ Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card bg-pastel-purple">
          <div className="metric-icon"><i className="fa-solid fa-file-invoice"></i></div>
          <div>
            <div className="metric-value">{totalGenerated}</div>
            <div className="metric-label">Filtered Generated Payslips</div>
          </div>
        </div>

        <div className="metric-card bg-pastel-green">
          <div className="metric-icon"><i className="fa-solid fa-money-bill-wave"></i></div>
          <div>
            <div className="metric-value">₹{totalAmount.toLocaleString('en-IN')}</div>
            <div className="metric-label">Filtered Disbursed Net Salary</div>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Employee Payslip Directory</h2>
        </div>

        {payslips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}></i>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>No payslips match your selected criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Payslip Ref No</th>
                  <th>Period</th>
                  <th>Employee Name & Email</th>
                  <th style={{ textAlign: 'right' }}>Monthly Gross</th>
                  <th style={{ textAlign: 'right' }}>Deductions</th>
                  <th style={{ textAlign: 'right' }}>Net Salary</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(ps => {
                  const registeredEmail = ps.user_email || (ps.employee_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@hiddenlamp.com');
                  const periodParts = (ps.period || '2026-07').split('-');
                  const mNum = periodParts.length >= 2 ? String(periodParts[1]).padStart(2, '0') : '07';
                  const yNameShort = periodParts[0] || '2026';
                  const payslipRefNo = `HL/PS/${mNum}-${yNameShort}/${String(ps.employee_id || 1).padStart(3, '0')}`;
                  return (
                    <tr key={ps.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#eff6ff', color: '#1e40af', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.82rem', border: '1px solid #bfdbfe' }}>
                          {payslipRefNo}
                        </span>
                      </td>
                      <td><strong>{ps.period}</strong></td>
                      <td>
                        <strong>{ps.employee_name}</strong>
                        <br /><small style={{ color: 'var(--accent)', fontWeight: 500 }}><i className="fa-regular fa-envelope"></i> {registeredEmail}</small>
                      </td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>₹{ps.gross_pay.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{ps.total_deductions.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>₹{ps.net_pay.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'center' }}>
                        {ps.run_status === 'approved' ? (
                          <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>Issued</span>
                        ) : (
                          <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Pending</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button onClick={() => openPayslipModal(ps)} className="btn btn-sm btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                            👁️ View
                          </button>
                          <a href={`/payroll/${ps.payroll_run_id}/payslip/${ps.employee_id}/pdf`} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                            📥 PDF
                          </a>
                          <button onClick={() => handleSendEmail(ps)} className="btn btn-sm" style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem', background: '#2563eb', color: '#fff', border: '1px solid #2563eb', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                            ✉️ Email
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* A4 PREVIEW MODAL */}
      {showModal && breakdown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '750px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>Payslip A4 Document Preview</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{breakdown.employee?.name} | Period: {breakdown.period}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                  <i className="fa-solid fa-print"></i> Print A4
                </button>
                <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Hidden Lamp Private Limited</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>26, UIT Pratap Nagar, Jodhpur Rajasthan, 342001 India</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#eff6ff', color: '#1e40af', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.82rem', border: '1px solid #bfdbfe' }}>
                    HL/PS/{(breakdown.period || '2026-07').split('-')[1] || '07'}-{(breakdown.period || '2026-07').split('-')[0] || '2026'}/{String(breakdown.employee?.id || 1).padStart(3, '0')}
                  </span>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pay Period: {breakdown.period}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', margin: '0 0 0.25rem 0' }}>Employee Details</p>
                  <p style={{ fontWeight: 700, margin: 0, fontSize: '1rem' }}>{breakdown.employee?.name}</p>
                  <p style={{ margin: 0 }}>Designation: {breakdown.employee?.designation}</p>
                  <p style={{ margin: 0 }}>Department: {breakdown.employee?.department}</p>
                  <p style={{ margin: 0 }}>Work Location: {breakdown.employee?.work_location}</p>
                </div>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1rem', borderRadius: '8px', textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Total Net Payable</p>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#064e3b' }}>₹{(breakdown.net_pay || 0).toLocaleString('en-IN')}</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', fontWeight: 600, color: '#065f46' }}>Paid Days: {breakdown.days_present} | LOP Days: {breakdown.days_lop}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipsPage;
