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

  const handleResetRun = async (runId, periodName) => {
    if (!window.confirm(`Reset and delete payroll run for ${periodName}? All generated payslips for this period will be deleted.`)) return;
    try {
      await api.post(`/payroll/${runId}/delete`);
      setShowRunModal(false);
      fetchRuns();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset payroll run.');
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Wipe ALL payroll runs and generated payslips? Employee profiles and salaries will remain completely safe.')) return;
    try {
      await api.post('/payroll/reset-all-runs');
      setShowRunModal(false);
      fetchRuns();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset all payroll runs.');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Monthly Payroll Calendar & Runs</h1>
          <p className="page-description">Select any month from the interactive calendar to generate, process, or reset payroll runs.</p>
        </div>
        {runs.length > 0 && (
          <button
            onClick={handleResetAll}
            className="btn btn-secondary"
            style={{ fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5' }}
          >
            🔄 Reset All Payroll Runs
          </button>
        )}
      </div>

      {/* Year Switcher Bar Card */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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
            Click any month card below to launch, open, or reset its payroll cycle.
          </div>
        </div>
      </div>

      {/* 12-Month Interactive Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
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
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => openRunModal(m.existingRun)}
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
                  >
                    {m.existingRun.status === 'approved' ? '📄 View Locked Run' : '⚙️ Process Payroll'}
                  </button>
                  <button
                    onClick={() => handleResetRun(m.existingRun.id, `${m.name} ${selectedYear}`)}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.82rem', color: '#dc2626', borderColor: '#fca5a5', padding: '0.35rem 0.6rem' }}
                    title="Reset / Delete Payroll Run"
                  >
                    🔄 Reset
                  </button>
                </div>
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

      {/* Payroll History Table Card */}
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
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => openRunModal(run)} className="btn btn-sm btn-secondary" style={{ fontSize: '0.8rem' }}>
                          {run.status === 'approved' ? '📄 View Locked Run' : '⚙️ Process & Calculate'}
                        </button>
                        <button
                          onClick={() => handleResetRun(run.id, run.period)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        >
                          🔄 Reset Run
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYROLL RUN PROCESSING MODAL */}
      {showRunModal && selectedRun && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '1.75rem', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Payroll Run: {selectedRun.period} ({selectedRun.status.toUpperCase()})
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Pay Date: {selectedRun.pay_date}
                </p>
              </div>
              <button onClick={() => setShowRunModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Attendance & Leave Without Pay (LOP) Days</h4>
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th>Employee</th>
                      <th>Designation</th>
                      <th style={{ textAlign: 'center' }}>LOP Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmps.map(emp => (
                      <tr key={emp.id}>
                        <td><strong>{emp.name}</strong> ({emp.employee_code})</td>
                        <td>{emp.designation}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max="31"
                            value={lopInputs[emp.id] || 0}
                            onChange={e => setLopInputs({ ...lopInputs, [emp.id]: parseInt(e.target.value) || 0 })}
                            disabled={selectedRun.status === 'approved'}
                            style={{ width: '70px', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                onClick={() => handleResetRun(selectedRun.id, selectedRun.period)}
                className="btn btn-secondary"
                style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5' }}
              >
                🔄 Reset / Delete This Payroll Cycle
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowRunModal(false)} className="btn btn-secondary">Close</button>
                {selectedRun.status === 'draft' && (
                  <>
                    <button onClick={handleCalculatePayroll} className="btn btn-primary">⚡ Calculate Payroll</button>
                    {runPayslips.length > 0 && (
                      <button onClick={handleApproveRun} className="btn btn-success" style={{ background: '#16a34a', color: '#fff' }}>
                        ✔ Approve & Lock Payroll
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
