import React, { useState, useEffect } from 'react';
import api from '../api/client';

const ExpensesPage = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [travelExpenses, setTravelExpenses] = useState([]);
  const [companyExpenses, setCompanyExpenses] = useState([]);
  const [projectSummary, setProjectSummary] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Forms
  const [newTravel, setNewTravel] = useState({
    employee_id: '',
    project_name: 'General Corporate',
    claim_type: 'Travel',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    purpose: '',
    claim_total_amount: '',
    advance_paid: '',
    receipt_ref: ''
  });

  const [newCompany, setNewCompany] = useState({
    title: '',
    project_name: 'Hazaribagh Solar Site',
    category: 'Project Site Material',
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
      setProjectSummary(res.data.projectSummary || []);
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
      setNewTravel({ employee_id: employees[0]?.id || '', project_name: 'General Corporate', claim_type: 'Travel', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], purpose: '', claim_total_amount: '', advance_paid: '', receipt_ref: '' });
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
      setNewCompany({ title: '', project_name: 'Hazaribagh Solar Site', category: 'Project Site Material', amount: '', date: new Date().toISOString().split('T')[0], work_location: 'Hazaribagh', vendor_name: '', payment_mode: 'Bank Transfer' });
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Corporate Receipts & Project Expenses</h1>
          <p className="page-description">Track city-wise project site expenses, vendor receipts, employee field claims, and company overhead.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowCompanyModal(true)}>
            <i className="fa-solid fa-building-circle-check"></i> + Project / Company Expense
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowTravelModal(true)}>
            <i className="fa-solid fa-plus"></i> + Add Field Expense Claim
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card bg-pastel-orange">
          <div className="metric-icon"><i className="fa-solid fa-building-user"></i></div>
          <div>
            <div className="metric-value">₹{totalCompanyExpenses.toLocaleString('en-IN')}</div>
            <div className="metric-label">Project Site & Company Expenses</div>
          </div>
        </div>

        <div className="metric-card bg-pastel-blue">
          <div className="metric-icon"><i className="fa-solid fa-plane-up"></i></div>
          <div>
            <div className="metric-value">₹{totalTravelClaims.toLocaleString('en-IN')}</div>
            <div className="metric-label">Employee Field Claims</div>
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
      </div>

      {/* Tabs Header */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('company')}
            className={`btn ${activeTab === 'company' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            <i className="fa-solid fa-landmark"></i> Company & Project Receipts ({companyExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`btn ${activeTab === 'projects' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            <i className="fa-solid fa-diagram-project"></i> Project-Wise Breakdown ({projectSummary.length})
          </button>
          <button
            onClick={() => setActiveTab('travel')}
            className={`btn ${activeTab === 'travel' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            <i className="fa-solid fa-users-gear"></i> Employee Field Claims ({travelExpenses.length})
          </button>
        </div>
      </div>

      {/* TAB 1: COMPANY & PROJECT RECEIPTS */}
      {activeTab === 'company' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><i className="fa-solid fa-building-user" style={{ color: 'var(--accent)' }}></i> Project Site & Corporate Overhead ({companyExpenses.length} Receipts)</h2>
          </div>

          {companyExpenses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No company operational expenses recorded.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Project & City Location</th>
                    <th>Title & Category</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ textAlign: 'center' }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companyExpenses.map(c => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>
                          🏗️ {c.project_name || 'General Corporate'}
                        </span>
                        <br /><small style={{ color: 'var(--text-muted)' }}>📍 {c.work_location}</small>
                      </td>
                      <td>
                        <strong>{c.title}</strong>
                        <br /><small style={{ color: 'var(--text-muted)' }}>{c.category}</small>
                      </td>
                      <td>{c.vendor_name || 'N/A'}</td>
                      <td>{c.date}</td>
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

      {/* TAB 2: PROJECT-WISE BREAKDOWN */}
      {activeTab === 'projects' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent)' }}></i> Project-Wise Expense & City Breakdown</h2>
          </div>

          {projectSummary.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No project site expenses recorded yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', padding: '1rem' }}>
              {projectSummary.map((p, idx) => (
                <div key={idx} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>
                        📍 {p.work_location}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>{p.project_name}</h3>
                    </div>
                    <span style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '9999px' }}>
                      {p.count} Receipts
                    </span>
                  </div>
                  <div style={{ marginTop: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Total Expenditure</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>₹{(p.total_spent || 0).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EMPLOYEE FIELD CLAIMS */}
      {activeTab === 'travel' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><i className="fa-solid fa-address-book" style={{ color: 'var(--accent)' }}></i> Employee Field & Travel Claims</h2>
          </div>

          {travelExpenses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No employee expense records found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee Info</th>
                    <th>Project</th>
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
                      <td>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                          🏗️ {t.project_name || 'General Corporate'}
                        </span>
                      </td>
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

      {/* MODAL 1: ADD EMPLOYEE CLAIM */}
      {showTravelModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Add Employee Field Expense Claim</h2>
              <button onClick={() => setShowTravelModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleAddTravel} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Project / Site</label>
                <input type="text" value={newTravel.project_name} onChange={e => setNewTravel({...newTravel, project_name: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} placeholder="Hazaribagh Site Alpha" />
              </div>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Total Amount (₹)</label>
                  <input type="number" required placeholder="0.00" value={newTravel.claim_total_amount} onChange={e => setNewTravel({...newTravel, claim_total_amount: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 700, color: '#2563eb' }} />
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
              <h2 className="card-title" style={{ margin: 0 }}>Add Project / Company Expense</h2>
              <button onClick={() => setShowCompanyModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Project Name</label>
                <input type="text" required placeholder="Hazaribagh Solar Site" value={newCompany.project_name} onChange={e => setNewCompany({...newCompany, project_name: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Expense Title</label>
                <input type="text" required placeholder="Site Solar Panels & Wiring" value={newCompany.title} onChange={e => setNewCompany({...newCompany, title: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
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
