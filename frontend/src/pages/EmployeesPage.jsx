import React, { useState, useEffect } from 'react';
import api from '../api/client';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('Active');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);

  // Selected Employee State
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Forms State
  const [empForm, setEmpForm] = useState({
    employee_code: '',
    name: '',
    email: '',
    designation: 'Staff',
    department: 'Operations',
    work_location: 'Hazaribagh',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active',
    bank_account: '',
    ifsc_code: ''
  });

  const [salaryForm, setSalaryForm] = useState({
    basic_salary: '',
    hra: '',
    conveyance: '',
    special_allowance: '',
    pf_employee: '',
    esi_employee: '',
    tds: ''
  });

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data.employees || []);
      const dbLocs = res.data.locations || [];
      const defaultLocs = ['Dantewada', 'Deoghar', 'Gomia', 'Gumla', 'Hazaribagh', 'Khunti', 'Patna', 'Ranchi', 'Sahibganj'];
      const combinedLocs = Array.from(new Set([...defaultLocs, ...dbLocs])).sort();
      setLocations(combinedLocs);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', empForm);
      setShowAddModal(false);
      setEmpForm({ employee_code: '', name: '', email: '', designation: 'Staff', department: 'Operations', work_location: 'Hazaribagh', joining_date: new Date().toISOString().split('T')[0], status: 'active', bank_account: '', ifsc_code: '' });
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add employee.');
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/employees/${selectedEmp.id}/edit`, empForm);
      setShowEditModal(false);
      fetchEmployees();
    } catch (err) {
      alert('Failed to update employee.');
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`Are you sure you want to permanently delete employee ${emp.name} (${emp.employee_code || emp.id})? All associated salary data will be removed.`)) return;
    try {
      await api.post(`/employees/${emp.id}/delete`);
      alert(`Employee ${emp.name} deleted successfully!`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete employee.');
    }
  };

  const openSalaryModal = async (emp) => {
    setSelectedEmp(emp);
    try {
      const res = await api.get(`/employees/${emp.id}/salary`);
      const s = res.data.salary || {};
      setSalaryForm({
        basic_salary: s.basic_salary || '',
        hra: s.hra || '',
        conveyance: s.conveyance || '',
        special_allowance: s.special_allowance || '',
        pf_employee: s.pf_employee || '',
        esi_employee: s.esi_employee || '',
        tds: s.tds || ''
      });
      setShowSalaryModal(true);
    } catch (err) {
      alert('Failed to load salary structure.');
    }
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/employees/${selectedEmp.id}/salary`, salaryForm);
      alert('Salary structure updated successfully!');
      setShowSalaryModal(false);
      fetchEmployees();
    } catch (err) {
      alert('Failed to save salary structure.');
    }
  };

  // Filter employees by Location & Status (case-insensitive status match!)
  const filteredEmployees = employees.filter(emp => {
    const locMatch = selectedLocation === 'all' || emp.work_location === selectedLocation;
    const statusMatch = selectedStatus === 'All' || (emp.status || '').toLowerCase() === selectedStatus.toLowerCase();
    return locMatch && statusMatch;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Employees Register</h1>
          <p className="page-description">Location-wise headcount and monthly salary register for Hidden Lamp.</p>
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ fontWeight: 600, padding: '0.6rem 1.25rem' }}>
            <i className="fa-solid fa-plus"></i> + Add New Employee
          </button>
        </div>
      </div>

      {/* Location Filter Pills Bar (Screenshot 1 Match) */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Location:</span>
          <button
            onClick={() => setSelectedLocation('all')}
            className={`btn btn-sm ${selectedLocation === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '20px', padding: '0.3rem 0.85rem', fontWeight: 600 }}
          >
            All Locations
          </button>
          {locations.map(loc => (
            <button
              key={loc}
              onClick={() => setSelectedLocation(loc)}
              className={`btn btn-sm ${selectedLocation === loc ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '20px', padding: '0.3rem 0.85rem', fontWeight: 600 }}
            >
              {loc}
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['Active', 'Exited', 'All'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`btn btn-sm ${selectedStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.82rem' }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Register Table (Screenshot 1 Match) */}
      <div className="card">
        {filteredEmployees.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No employees found for the selected location or status.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>EMP CODE</th>
                  <th>NAME</th>
                  <th>DESIGNATION</th>
                  <th>DEPARTMENT</th>
                  <th>LOCATION</th>
                  <th>JOINING DATE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id}>
                    <td><strong style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{emp.employee_code || ('HL-' + String(emp.id).padStart(3, '0'))}</strong></td>
                    <td>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{emp.name}</strong>
                      <br /><small style={{ color: 'var(--text-muted)' }}>{emp.email}</small>
                    </td>
                    <td>{emp.designation || 'Staff'}</td>
                    <td>{emp.department || 'Operations'}</td>
                    <td>
                      <span style={{ background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                        {emp.work_location}
                      </span>
                    </td>
                    <td>{emp.date_of_joining || emp.joining_date || '2024-01-01'}</td>
                    <td>
                      <span className={`badge badge-${(emp.status || '').toLowerCase() === 'active' ? 'approved' : 'draft'}`}>
                        {(emp.status || 'Active').charAt(0).toUpperCase() + (emp.status || 'Active').slice(1)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => openSalaryModal(emp)}
                        className="btn btn-sm btn-secondary"
                        style={{ marginRight: '0.4rem', fontSize: '0.78rem' }}
                      >
                        <i className="fa-solid fa-gear"></i> Salary
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEmp(emp);
                          setEmpForm({
                            employee_code: emp.employee_code || '',
                            name: emp.name || '',
                            email: emp.email || '',
                            designation: emp.designation || 'Staff',
                            department: emp.department || 'Operations',
                            work_location: emp.work_location || 'Hazaribagh',
                            joining_date: emp.date_of_joining || emp.joining_date || new Date().toISOString().split('T')[0],
                            status: emp.status || 'active',
                            bank_account: emp.bank_account || '',
                            ifsc_code: emp.ifsc_code || ''
                          });
                          setShowEditModal(true);
                        }}
                        className="btn btn-sm btn-secondary"
                        style={{ marginRight: '0.4rem', fontSize: '0.78rem' }}
                      >
                        <i className="fa-solid fa-pencil"></i> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5' }}
                        title="Delete Employee"
                      >
                        <i className="fa-solid fa-trash"></i> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '550px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Add New Employee</h2>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Employee Code</label>
                  <input type="text" required placeholder="e.g. HL-045" value={empForm.employee_code} onChange={e => setEmpForm({...empForm, employee_code: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Full Name</label>
                  <input type="text" required placeholder="John Doe" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Email Address</label>
                <input type="email" required placeholder="john@hiddenlamp.com" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Designation</label>
                  <input type="text" value={empForm.designation} onChange={e => setEmpForm({...empForm, designation: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Department</label>
                  <input type="text" value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Work Location</label>
                  <select value={empForm.work_location} onChange={e => setEmpForm({...empForm, work_location: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    {locations.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Joining Date</label>
                  <input type="date" value={empForm.joining_date} onChange={e => setEmpForm({...empForm, joining_date: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {showEditModal && selectedEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '550px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Edit Employee: {selectedEmp.name}</h2>
              <button onClick={() => setShowEditModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleEditEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Employee Code</label>
                  <input type="text" required value={empForm.employee_code} onChange={e => setEmpForm({...empForm, employee_code: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Full Name</label>
                  <input type="text" required value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Email Address</label>
                <input type="email" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Designation</label>
                  <input type="text" value={empForm.designation} onChange={e => setEmpForm({...empForm, designation: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Department</label>
                  <input type="text" value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Work Location</label>
                  <select value={empForm.work_location} onChange={e => setEmpForm({...empForm, work_location: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    {locations.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Status</label>
                  <select value={empForm.status} onChange={e => setEmpForm({...empForm, status: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <option value="active">Active</option>
                    <option value="exited">Exited</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Update Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY STRUCTURE MODAL */}
      {showSalaryModal && selectedEmp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Salary Structure: {selectedEmp.name}</h2>
              <button onClick={() => setShowSalaryModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleSaveSalary} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Basic Salary (₹)</label>
                  <input type="number" required placeholder="0.00" value={salaryForm.basic_salary} onChange={e => setSalaryForm({...salaryForm, basic_salary: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 700, color: '#059669' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>HRA (₹)</label>
                  <input type="number" placeholder="0.00" value={salaryForm.hra} onChange={e => setSalaryForm({...salaryForm, hra: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Conveyance (₹)</label>
                  <input type="number" placeholder="0.00" value={salaryForm.conveyance} onChange={e => setSalaryForm({...salaryForm, conveyance: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Special Allowance (₹)</label>
                  <input type="number" placeholder="0.00" value={salaryForm.special_allowance} onChange={e => setSalaryForm({...salaryForm, special_allowance: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>PF Deduction (₹)</label>
                  <input type="number" placeholder="0.00" value={salaryForm.pf_employee} onChange={e => setSalaryForm({...salaryForm, pf_employee: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', color: '#dc2626' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>TDS (₹)</label>
                  <input type="number" placeholder="0.00" value={salaryForm.tds} onChange={e => setSalaryForm({...salaryForm, tds: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', color: '#dc2626' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSalaryModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Salary Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
