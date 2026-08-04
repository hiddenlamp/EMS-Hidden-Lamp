import React, { useState, useEffect } from 'react';
import api from '../api/client';

const ExpensesPage = () => {
  const [activeTab, setActiveTab] = useState('travel');
  const [travelExpenses, setTravelExpenses] = useState([]);
  const [companyExpenses, setCompanyExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Forms (No hardcoded demo values!)
  const [newTravel, setNewTravel] = useState({
    employee_id: '',
    claim_type: 'Travel',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    purpose: '',
    total_amount: '',
    advance_paid: '',
    receipt_ref: ''
  });

  const [newCompany, setNewCompany] = useState({
    title: '',
    category: 'Office Operations',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    work_location: 'Hazaribagh',
    vendor_name: '',
    payment_mode: 'Bank Transfer'
  });

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      setTravelExpenses(res.data.travelExpenses || []);
      setCompanyExpenses(res.data.companyExpenses || []);
      setEmployees(res.data.employees || []);
      if (res.data.employees?.length > 0 && !newTravel.employee_id) {
        setNewTravel(prev => ({ ...prev, employee_id: res.data.employees[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddTravel = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses/travel', newTravel);
      setShowTravelModal(false);
      setNewTravel({ employee_id: employees[0]?.id || '', claim_type: 'Travel', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], purpose: '', total_amount: '', advance_paid: '', receipt_ref: '' });
      fetchExpenses();
    } catch (err) {
      alert('Failed to submit travel expense.');
    }
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses/company', newCompany);
      setShowCompanyModal(false);
      setNewCompany({ title: '', category: 'Office Operations', amount: '', date: new Date().toISOString().split('T')[0], work_location: 'Hazaribagh', vendor_name: '', payment_mode: 'Bank Transfer' });
      fetchExpenses();
    } catch (err) {
      alert('Failed to record company overhead.');
    }
  };

  // Metrics
  const totalTravelClaims = travelExpenses.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const totalAdvancePaid = travelExpenses.reduce((sum, t) => sum + (t.advance_paid || 0), 0);
  const totalPendingDues = travelExpenses.reduce((sum, t) => sum + (t.dues_amount || 0), 0);
  const totalCompanyExpenses = companyExpenses.reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses & Travel Reimbursements</h1>
          <p className="page-description">Track employee travel claims, out-of-pocket purchases, advance paid, accumulated dues, and company overhead.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowCompanyModal(true)}>
            <i className="fa-solid fa-building-circle-check"></i> + Company Expense
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowTravelModal(true)}>
            <i className="fa-solid fa-plus"></i> + Add Expense Claim
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card bg-pastel-blue">
          <div className="metric-icon"><i className="fa-solid fa-plane-up"></i></div>
          <div>
            <div className="metric-value">₹{totalTravelClaims.toLocaleString('en-IN')}</div>
            <div className="metric-label">Total Employee Claims</div>
          </div>
        </div>

        <div className="metric-card bg-pastel-green">
          <div className="metric-icon"><i className="fa-solid fa-hand-holding-dollar"></i></div>
          <div>
            <div className="metric-value">₹{totalAdvancePaid.toLocaleString('en-IN')}</div>
            <div className="metric-label">Total Advance / Paid</div>
          </div>
        </div>

        <div className="metric-card bg-pastel-red" style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
          <div className="metric-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}><i className="fa-solid fa-scale-unbalanced"></i></div>
          <div>
            <div className="metric-value" style={{ color: '#be123c' }}>₹{totalPendingDues.toLocaleString('en-IN')}</div>
            <div className="metric-label" style={{ color: '#9f1239' }}>Total Accrued Balance Dues</div>
          </div>
        </div>

        <div className="metric-card bg-pastel-orange">
          <div className="metric-icon"><i className="fa-solid fa-building"></i></div>
          <div>
            <div className="metric-value">₹{totalCompanyExpenses.toLocaleString('en-IN')}</div>
            <div className="metric-label">Company Operational Overhead</div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('travel')}
            className={`btn ${activeTab === 'travel' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            <i className="fa-solid fa-users-gear"></i> Employee Expense Summaries ({travelExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`btn ${activeTab === 'company' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            <i className="fa-solid fa-landmark"></i> Company Expenses ({companyExpenses.length})
          </button>
        </div>
      </div>

      {/* TAB 1: EMPLOYEE TRAVEL CLAIMS */}
      {activeTab === 'travel' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><i className="fa-solid fa-address-book" style={{ color: 'var(--accent)' }}></i> Employee Expense & Reimbursement Summaries</h2>
          </div>

          {travelExpenses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No employee expense records found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee Info</th>
                    <th>Claim Type</th>
                    <th>Purpose / Reason</th>
                    <th style={{ textAlign: 'right' }}>Total Claim (₹)</th>
                    <th style={{ textAlign: 'right' }}>Paid / Advance (₹)</th>
                    <th style={{ textAlign: 'right' }}>Balance Dues (₹)</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {travelExpenses.map(t => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.employee_name}</strong>
                        <br /><small style={{ color: 'var(--text-muted)' }}>{t.work_location}</small>
                      </td>
                      <td><strong>{t.claim_type}</strong></td>
                      <td>{t.purpose}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{(t.total_amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#047857' }}>₹{(t.advance_paid || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: (t.dues_amount || 0) > 0 ? '#b91c1c' : '#059669' }}>₹{(t.dues_amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge badge-${t.status === 'Approved' ? 'approved' : 'draft'}`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPANY EXPENSES */}
      {activeTab === 'company' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><i className="fa-solid fa-building-user" style={{ color: 'var(--accent)' }}></i> Company Operational Overhead ({companyExpenses.length} Bills)</h2>
          </div>

          {companyExpenses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No company operational expenses recorded.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title & Category</th>
                    <th>Vendor</th>
                    <th>Date & Location</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ textAlign: 'center' }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companyExpenses.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.title}</strong>
                        <br /><small style={{ color: 'var(--text-muted)' }}>{c.category}</small>
                      </td>
                      <td>{c.vendor_name || 'N/A'}</td>
                      <td>
                        <div>{c.date}</div>
                        <small style={{ color: 'var(--text-muted)' }}>{c.work_location}</small>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>₹{(c.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-approved">{c.payment_status || 'Paid'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD EMPLOYEE CLAIM */}
      {showTravelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Add Employee Expense Claim</h2>
              <button onClick={() => setShowTravelModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleAddTravel} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Select Employee</label>
                <select value={newTravel.employee_id} onChange={e => setNewTravel({...newTravel, employee_id: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.work_location})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Claim Category</label>
                  <input type="text" value={newTravel.claim_type} onChange={e => setNewTravel({...newTravel, claim_type: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Total Claim Amount (₹)</label>
                  <input type="number" required placeholder="0.00" value={newTravel.total_amount} onChange={e => setNewTravel({...newTravel, total_amount: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 700, color: '#2563eb' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Purpose / Reason</label>
                <textarea rows="2" value={newTravel.purpose} onChange={e => setNewTravel({...newTravel, purpose: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} placeholder="Client visit, travel tickets..." />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowTravelModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD COMPANY EXPENSE */}
      {showCompanyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Record Company Overhead Bill</h2>
              <button onClick={() => setShowCompanyModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Bill Title</label>
                <input type="text" required placeholder="Office Rent" value={newCompany.title} onChange={e => setNewCompany({...newCompany, title: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Category</label>
                  <input type="text" value={newCompany.category} onChange={e => setNewCompany({...newCompany, category: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Amount (₹)</label>
                  <input type="number" required placeholder="0.00" value={newCompany.amount} onChange={e => setNewCompany({...newCompany, amount: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 700, color: '#2563eb' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCompanyModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
