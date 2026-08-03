import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Search, Plus, MapPin, IndianRupee, Edit3, Settings, Check, X } from 'lucide-react';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [salaryComponents, setSalaryComponents] = useState([]);

  // Form states
  const [newEmp, setNewEmp] = useState({
    employee_code: '',
    name: '',
    designation: 'Staff',
    department: 'Operations',
    work_location: 'Hazaribagh',
    joining_date: '',
    pan: '',
    bank_name: '',
    bank_account: '',
    base_salary: 18000
  });

  const fetchEmployees = async () => {
    try {
      const res = await api.get(`/employees?search=${search}&location=${selectedLocation}`);
      setEmployees(res.data.employees);
      setLocations(res.data.locations);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedLocation]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', newEmp);
      setShowAddModal(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employee Staff Directory</h1>
          <p className="text-sm text-slate-500">Manage employee profiles, work locations, and monthly fixed salary structures.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name, code, designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="w-48">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">⚡ All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Department & Role</th>
                <th className="p-4">Work Location</th>
                <th className="p-4 text-right">Fixed Monthly Gross</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center border border-blue-200 text-sm">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{emp.employee_code || `HL00${emp.id}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-800">{emp.designation}</p>
                    <p className="text-xs text-slate-500">{emp.department}</p>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{emp.work_location}</span>
                    </span>
                  </td>
                  <td className="p-4 text-right font-extrabold text-blue-600">
                    ₹{(emp.gross_salary || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {emp.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => openSalaryModal(emp)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 ml-auto transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-blue-600" />
                      <span>Salary Structure</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Add New Employee Profile</h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Employee Code</label>
                  <input type="text" required placeholder="HL0010" value={newEmp.employee_code} onChange={e => setNewEmp({...newEmp, employee_code: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Full Name</label>
                  <input type="text" required placeholder="Rahul Sharma" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Designation</label>
                  <input type="text" placeholder="Software Engineer" value={newEmp.designation} onChange={e => setNewEmp({...newEmp, designation: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Department</label>
                  <input type="text" placeholder="IT / Engineering" value={newEmp.department} onChange={e => setNewEmp({...newEmp, department: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Work Location</label>
                  <input type="text" required placeholder="Hazaribagh" value={newEmp.work_location} onChange={e => setNewEmp({...newEmp, work_location: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Base Basic Salary (₹)</label>
                  <input type="number" required placeholder="18000" value={newEmp.base_salary} onChange={e => setNewEmp({...newEmp, base_salary: e.target.value})} className="w-full p-2 text-sm border rounded-lg font-bold text-blue-600" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-md shadow-blue-600/30">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY STRUCTURE SETUP MODAL */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Configure Salary Structure</h2>
                <p className="text-xs text-slate-500">Employee: {selectedEmp?.name} ({selectedEmp?.employee_code})</p>
              </div>
              <button onClick={() => setShowSalaryModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveSalary} className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {salaryComponents.map((comp, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={comp.component_name}
                      onChange={e => {
                        const updated = [...salaryComponents];
                        updated[idx].component_name = e.target.value;
                        setSalaryComponents(updated);
                      }}
                      className="flex-1 p-2 text-sm border rounded-lg font-semibold"
                      placeholder="Basic Salary / HRA"
                    />
                    <select
                      value={comp.type}
                      onChange={e => {
                        const updated = [...salaryComponents];
                        updated[idx].type = e.target.value;
                        setSalaryComponents(updated);
                      }}
                      className="p-2 text-sm border rounded-lg font-medium"
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
                      className="w-32 p-2 text-sm border rounded-lg font-bold text-slate-800"
                    />
                    <button type="button" onClick={() => removeComponentRow(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addComponentRow} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Component Line</span>
              </button>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowSalaryModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-md shadow-blue-600/30">Save Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
