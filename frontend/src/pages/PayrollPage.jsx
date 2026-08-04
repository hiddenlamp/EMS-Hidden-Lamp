import React, { useState, useEffect } from 'react';
import api from '../api/client';

const PayrollPage = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);

  // Selected run state
  const [selectedRun, setSelectedRun] = useState(null);
  const [runPayslips, setRunPayslips] = useState([]);
  const [activeEmps, setActiveEmps] = useState([]);
  const [lopInputs, setLopInputs] = useState({});

  // Create form state (No hardcoded demo values!)
  const [newRun, setNewRun] = useState({
    period: '',
    pay_date: ''
  });

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

  const handleCreateRun = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll', newRun);
      setShowCreateModal(false);
      setNewRun({ period: '', pay_date: '' });
      fetchRuns();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create payroll run.');
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
      alert('Payroll calculated successfully with Basic Salary LOP formula!');
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
          <h1 className="page-title">Monthly Payroll Run Processing</h1>
          <p className="page-description">Create payroll runs, calculate LOP deductions, and issue approved payslips.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          + Create New Payroll Run
        </button>
      </div>

      <div className="card">
        {runs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No payroll runs created yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Pay Date</th>
                  <th>Total Payslips</th>
                  <th style={{ textAlign: 'right' }}>Disbursed Net Pay</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id}>
                    <td><strong>{run.period}</strong></td>
                    <td>{run.pay_date}</td>
                    <td>{run.total_payslips} Generated</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>₹{run.total_net_disbursed.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge badge-${run.status}`}>{run.status?.toUpperCase()}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => openRunModal(run)} className="btn btn-sm btn-secondary">
                        <i className="fa-regular fa-eye"></i> Manage Run
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE RUN MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Initiate New Payroll Run</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleCreateRun} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Payroll Period (YYYY-MM)</label>
                <input type="text" required placeholder="YYYY-MM" value={newRun.period} onChange={e => setNewRun({...newRun, period: e.target.value})} style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>Pay Disbursal Date</label>
                <input type="date" required value={newRun.pay_date} onChange={e => setNewRun({...newRun, pay_date: e.target.value})} style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create Draft Run</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE RUN MODAL */}
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
