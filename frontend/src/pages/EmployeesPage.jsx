import React, { useState, useEffect } from 'react';
import api from '../api/client';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [salaryComponents, setSalaryComponents] = useState([]);

  // Form states (No hardcoded demo values!)
  const [newEmp, setNewEmp] = useState({
    employee_code: '',
    name: '',
    designation: '',
    department: '',
    work_location: 'Hazaribagh',
    joining_date: '',
    pan: '',
    bank_name: '',
    bank_account: '',
    base_salary: ''
  });

  const fetchEmployees = async () => {
    try {
      const locQuery = locationFilter === 'all' ? '' : locationFilter;
      const statusQuery = statusFilter === 'all' ? '' : statusFilter;
      const res = await api.get(`/employees?search=${search}&location=${encodeURIComponent(locQuery)}&status=${statusQuery}`);
      setEmployees(res.data.employees || []);
      setLocations(res.data.locations || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, locationFilter, statusFilter]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', newEmp);
      setShowAddModal(false);
      setNewEmp({ employee_code: '', name: '', designation: '', department: '', work_location: 'Hazaribagh', joining_date: '', pan: '', bank_name: '', bank_account: '', base_salary: '' });
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add employee.');
    }
  };

  const openSalaryModal = async (emp) => {
    setSelectedEmp(emp);
    try {
      const res = await api.get(`/employees/${emp.id}/salary`);
      setSalaryComponents(res.data.components || []);
      setShowSalaryModal(true);
    } catch (err) {
      alert('Failed to fetch salary structure.');
    }
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    try {
      const names = salaryComponents.map(c => c.component_name);
      const types = salaryComponents.map(c => c.type);
      const amounts = salaryComponents.map(c => c.amount);

      await api.post(`/employees/${selectedEmp.id}/salary`, {
        component_name: names,
        type: types,
        amount: amounts,
        empName: selectedEmp.name
      });
      setShowSalaryModal(false);
      fetchEmployees();
    } catch (err) {
      alert('Failed to save salary structure.');
    }
  };

  const addComponentRow = () => {
    setSalaryComponents([...salaryComponents, { component_name: 'Allowance', type: 'earning', amount: 1000 }]);
  };

  const removeComponentRow = (index) => {
    setSalaryComponents(salaryComponents.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees Register</h1>
          <p className="page-description">Location-wise headcount and monthly salary register for Hidden Lamp.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          + Add New Employee
        </button>
      </div>

      <div className="card">
        {/* Filter Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Location Filter Links */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Location:</span>
            <button
              onClick={() => setLocationFilter('all')}
              className={`btn btn-sm ${locationFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Locations
            </button>
            {locations.map(loc => (
              <button
                key={loc}
                onClick={() => setLocationFilter(loc)}
                className={`btn btn-sm ${locationFilter === loc ? 'btn-primary' : 'btn-secondary'}`}
              >
                {loc}
              </button>
            ))}
          </div>

          {/* Status Filter Links */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setStatusFilter('active')} className={`btn btn-sm ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}>
              Active
            </button>
            <button onClick={() => setStatusFilter('exited')} className={`btn btn-sm ${statusFilter === 'exited' ? 'btn-primary' : 'btn-secondary'}`}>
              Exited
            </button>
            <button onClick={() => setStatusFilter('all')} className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}>
              All
            </button>
          </div>
        </div>

        {employees.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No employees found in this view.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Emp Code</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Gross Salary</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td><strong>{emp.employee_code || (`HL${String(emp.id).padStart(4, '0')}`)}</strong></td>
                    <td>
                      <strong>{emp.name}</strong>
                    </td>
                    <td>{emp.designation || 'Staff'}</td>
                    <td>{emp.department || 'General'}</td>
                    <td>
                      <span style={{ background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.8rem', color: '#334155' }}>
                        {emp.work_location}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>
                      ₹{(emp.gross_salary || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge badge-${emp.status}`}>{emp.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => openSalaryModal(emp)} className="btn btn-sm btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                          ⚙️ Salary
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

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Add New Employee Profile</h2>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Employee Code</label>
                  <input type="text" required placeholder="HL0010" value={newEmp.employee_code} onChange={e => setNewEmp({...newEmp, employee_code: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Full Name</label>
                  <input type="text" required placeholder="Rahul Sharma" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Designation</label>
                  <input type="text" placeholder="Software Engineer" value={newEmp.designation} onChange={e => setNewEmp({...newEmp, designation: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Department</label>
                  <input type="text" placeholder="IT / Engineering" value={newEmp.department} onChange={e => setNewEmp({...newEmp, department: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Work Location</label>
                  <input type="text" required placeholder="Hazaribagh" value={newEmp.work_location} onChange={e => setNewEmp({...newEmp, work_location: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Base Basic Salary (₹)</label>
                  <input type="number" required placeholder="18000" value={newEmp.base_salary} onChange={e => setNewEmp({...newEmp, base_salary: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 700, color: '#2563eb' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyRight: 'flex-end', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY STRUCTURE MODAL */}
      {showSalaryModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', margin: 'auto', background: '#fff', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', pb: '0.5rem' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>Configure Salary Structure</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Employee: {selectedEmp?.name} ({selectedEmp?.employee_code})</p>
              </div>
              <button onClick={() => setShowSalaryModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleSaveSalary} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                {salaryComponents.map((comp, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={comp.component_name}
                      onChange={e => {
                        const updated = [...salaryComponents];
                        updated[idx].component_name = e.target.value;
                        setSalaryComponents(updated);
                      }}
                      style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }}
                      placeholder="Component Name"
                    />
                    <select
                      value={comp.type}
                      onChange={e => {
                        const updated = [...salaryComponents];
                        updated[idx].type = e.target.value;
                        setSalaryComponents(updated);
                      }}
                      style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem' }}
                    >
                      <option value="earning">➕ Earning</option>
                      <option value="deduction">➖ Deduction</option>
                    </select>
                    <input
                      type="number"
                      value={comp.amount}
                      onChange={e => {
                        const updated = [...salaryComponents];
                        updated[idx].amount = parseFloat(e.target.value) || 0;
                        setSalaryComponents(updated);
                      }}
                      style={{ width: '110px', padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                    <button type="button" onClick={() => removeComponentRow(idx)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem' }}>
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addComponentRow} style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', marginTop: '0.25rem' }}>
                + Add Component Line
              </button>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSalaryModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
