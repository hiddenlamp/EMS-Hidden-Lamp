import React, { useState, useEffect } from 'react';
import api from '../api/client';

const PayrollPage = () => {
  const [runs, setRuns] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [showRunModal, setShowRunModal] = useState(false);

  // Selected run state for processing
  const [selectedRun, setSelectedRun] = useState(null);
  const [runPayslips, setRunPayslips] = useState([]);
  const [activeEmps, setActiveEmps] = useState([]);
  const [lopInputs, setLopInputs] = useState({});

  const fetchRuns = async () => {
    try {
      const res = await api.get('/payroll');
      setRuns(res.data.runs || []);
    } catch (err) {
      console.error('Failed to fetch payroll runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const monthDetails = [
    { num: '01', name: 'January', daysInMonth: 31, lastDay: `${selectedYear}-01-31` },
    { num: '02', name: 'February', daysInMonth: (selectedYear % 4 === 0) ? 29 : 28, lastDay: `${selectedYear}-02-${(selectedYear % 4 === 0) ? 29 : 28}` },
    { num: '03', name: 'March', daysInMonth: 31, lastDay: `${selectedYear}-03-31` },
    { num: '04', name: 'April', daysInMonth: 30, lastDay: `${selectedYear}-04-30` },
    { num: '05', name: 'May', daysInMonth: 31, lastDay: `${selectedYear}-05-31` },
    { num: '06', name: 'June', daysInMonth: 30, lastDay: `${selectedYear}-06-30` },
    { num: '07', name: 'July', daysInMonth: 31, lastDay: `${selectedYear}-07-31` },
    { num: '08', name: 'August', daysInMonth: 31, lastDay: `${selectedYear}-08-31` },
    { num: '09', name: 'September', daysInMonth: 30, lastDay: `${selectedYear}-09-30` },
    { num: '10', name: 'October', daysInMonth: 31, lastDay: `${selectedYear}-10-31` },
    { num: '11', name: 'November', daysInMonth: 30, lastDay: `${selectedYear}-11-30` },
    { num: '12', name: 'December', daysInMonth: 31, lastDay: `${selectedYear}-12-31` }
  ];

  const calendarMonths = monthDetails.map(m => {
    const periodStr = `${selectedYear}-${m.num}`;
    const existingRun = runs.find(r => r.period === periodStr);
    return { ...m, period: periodStr, existingRun };
  });

  const handleStartPayroll = async (periodStr, lastDay) => {
    try {
      await api.post('/payroll', { period: periodStr, pay_date: lastDay });
      await fetchRuns();
      // Open the newly created run modal
      const updatedRuns = await api.get('/payroll');
      const newlyCreated = updatedRuns.data.runs.find(r => r.period === periodStr);
      if (newlyCreated) openRunModal(newlyCreated);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start payroll run.');
    }
  };

  const openRunModal = async (run) => {
    try {
      const res = await api.get(`/payroll/${run.id}`);
      setSelectedRun(res.data.run);
      setRunPayslips(res.data.payslips || []);
      setActiveEmps(res.data.activeEmployees || []);

      const initialLop = {};
      (res.data.payslips || []).forEach(ps => {
        try {
          const breakdown = JSON.parse(ps.breakdown_json);
          initialLop[ps.employee_id] = breakdown.days_lop || 0;
        } catch (e) {
          initialLop[ps.employee_id] = 0;
        }
      });
      setLopInputs(initialLop);
      setShowRunModal(true);
    } catch (err) {
      alert('Failed to load run details.');
    }
  };

  const handleCalculatePayroll = async () => {
    try {
      await api.post(`/payroll/${selectedRun.id}/calculate`, { lop: lopInputs });
      alert('Payroll calculated successfully!');
      openRunModal(selectedRun);
      fetchRuns();
    } catch (err) {
      alert('Failed to calculate payroll.');
    }
  };

  const handleApproveRun = async () => {
    if (!window.confirm('Approve and lock this payroll run?')) return;
    try {
      await api.post(`/payroll/${selectedRun.id}/approve`);
      alert('Payroll run approved and locked!');
      openRunModal(selectedRun);
      fetchRuns();
    } catch (err) {
      alert('Failed to approve payroll run.');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Monthly Payroll Calendar & Runs</h1>
          <p className="page-description">Select any month from the interactive calendar to generate or process payroll based on the actual calendar days of that month.</p>
        </div>
      </div>

      {/* Year Switcher Bar Card */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>📅 Calendar Year:</span>
            <button onClick={() => setSelectedYear(selectedYear - 1)} className="btn btn-sm btn-secondary">
              ← {selectedYear - 1}
            </button>
            <span style={{ background: 'var(--accent)', color: '#fff', padding: '0.35rem 0.85rem', borderRadius: '6px', fontWeight: 800, fontSize: '1rem' }}>
              {selectedYear}
            </span>
            <button onClick={() => setSelectedYear(selectedYear + 1)} className="btn btn-sm btn-secondary">
              {selectedYear + 1} →
            </button>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Click any month card below to launch or open its payroll cycle.
          </div>
        </div>
      </div>

      {/* 12-Month Interactive Calendar Grid (Screenshot 2 Match) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {calendarMonths.map(m => (
          <div
            key={m.num}
            className="card"
            style={{
              marginBottom: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderTop: `4px solid ${m.existingRun ? (m.existingRun.status === 'approved' ? '#16a34a' : '#d97706') : '#cbd5e1'}`,
              ...(m.existingRun && m.existingRun.status === 'approved' ? { background: '#f0fdf4' } : {})
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{m.name} {selectedYear}</h3>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{m.daysInMonth} Days in Month</span>
                </div>
                {m.existingRun ? (
                  m.existingRun.status === 'approved' ? (
                    <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 800 }}>
                      <i className="fa-solid fa-circle-check"></i> Completed
                    </span>
                  ) : (
                    <span className="badge badge-draft">Draft</span>
                  )
                ) : (
                  <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Not Started</span>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              {m.existingRun ? (
                <button
                  onClick={() => openRunModal(m.existingRun)}
                  className="btn btn-sm btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {m.existingRun.status === 'approved' ? '📄 View Locked Run' : '⚙️ Process Payroll'}
                </button>
              ) : (
                <button
                  onClick={() => handleStartPayroll(m.period, m.lastDay)}
                  className="btn btn-sm btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  + Start {m.name} Payroll
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* All Payroll Runs History Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Payroll Runs History</h2>
        </div>

        {runs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No payroll runs created yet. Select a month above to start.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Pay Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id}>
                    <td><strong>{run.period}</strong></td>
                    <td>{run.pay_date}</td>
                    <td>
                      <span className={`badge badge-${run.status}`}>{run.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => openRunModal(run)} className="btn btn-sm btn-secondary">
                        {run.status === 'approved' ? '📄 View Locked Run' : '⚙️ Process & Calculate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANAGE PAYROLL RUN MODAL */}
      {showRunModal && selectedRun && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '850px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>Payroll Run Details: {selectedRun.period}</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pay Date: {selectedRun.pay_date} | Status: <strong style={{ color: '#2563eb' }}>{selectedRun.status?.toUpperCase()}</strong></p>
              </div>
              <button onClick={() => setShowRunModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {selectedRun.status === 'draft' && (
                <>
                  <button onClick={handleCalculatePayroll} className="btn btn-primary btn-sm">
                    <i className="fa-solid fa-calculator"></i> Calculate Payroll LOP
                  </button>
                  <button onClick={handleApproveRun} className="btn btn-success btn-sm">
                    <i className="fa-solid fa-circle-check"></i> Approve & Lock Run
                  </button>
                </>
              )}
            </div>

            {/* Attendance & Payslip Table */}
            <div className="table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>LOP Days Input</th>
                    <th style={{ textAlign: 'right' }}>Gross Pay</th>
                    <th style={{ textAlign: 'right' }}>Deductions</th>
                    <th style={{ textAlign: 'right' }}>Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmps.map(emp => {
                    const ps = runPayslips.find(p => p.employee_id === emp.id);
                    return (
                      <tr key={emp.id}>
                        <td>
                          <strong>{emp.name}</strong>
                          <br /><small style={{ color: 'var(--text-muted)' }}>{emp.work_location}</small>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            disabled={selectedRun.status === 'approved'}
                            value={lopInputs[emp.id] !== undefined ? lopInputs[emp.id] : 0}
                            onChange={e => setLopInputs({...lopInputs, [emp.id]: parseFloat(e.target.value) || 0})}
                            style={{ width: '80px', padding: '0.3rem', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px', fontWeight: 700 }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>₹{ps ? ps.gross_pay.toLocaleString('en-IN') : '-'}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>₹{ps ? ps.total_deductions.toLocaleString('en-IN') : '-'}</td>
                        <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>₹{ps ? ps.net_pay.toLocaleString('en-IN') : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
              <button onClick={() => setShowRunModal(false)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
