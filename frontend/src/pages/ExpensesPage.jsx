import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Receipt, Building, Plus, MapPin, X } from 'lucide-react';

const ExpensesPage = () => {
  const [activeTab, setActiveTab] = useState('travel');
  const [travelExpenses, setTravelExpenses] = useState([]);
  const [companyExpenses, setCompanyExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Forms
  const [newTravel, setNewTravel] = useState({
    employee_id: '',
    claim_type: 'Travel',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    purpose: '',
    total_amount: 0,
    advance_paid: 0,
    receipt_ref: ''
  });

  const [newCompany, setNewCompany] = useState({
    title: '',
    category: 'Office Operations',
    amount: 0,
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
      if (res.data.employees?.length > 0) {
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
      fetchExpenses();
    } catch (err) {
      alert('Failed to record company overhead.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Receipts & Expense Management</h1>
          <p className="text-sm text-slate-500">Track employee travel reimbursements and company operational overhead bills.</p>
        </div>
        <div className="flex space-x-2">
          {activeTab === 'travel' ? (
            <button
              onClick={() => setShowTravelModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee Claim</span>
            </button>
          ) : (
            <button
              onClick={() => setShowCompanyModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Company Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('travel')}
          className={`pb-3 px-4 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'travel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Employee Claims ({travelExpenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`pb-3 px-4 text-sm font-bold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'company' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Company Operational Overhead ({companyExpenses.length})</span>
        </button>
      </div>

      {/* Tab 1: Employee Travel Expenses */}
      {activeTab === 'travel' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Claim Type</th>
                  <th className="p-4">Purpose / Description</th>
                  <th className="p-4 text-right">Claim Amount</th>
                  <th className="p-4 text-right">Paid Advance</th>
                  <th className="p-4 text-right">Balance Dues</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {travelExpenses.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{t.employee_name}</p>
                      <p className="text-xs text-slate-400">{t.work_location}</p>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{t.claim_type}</td>
                    <td className="p-4 text-xs text-slate-600 max-w-xs truncate">{t.purpose}</td>
                    <td className="p-4 text-right font-bold text-slate-900">₹{t.total_amount.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right text-emerald-600 font-semibold">₹{t.advance_paid.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right font-extrabold text-red-600">₹{t.dues_amount.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.status === 'Approved' || t.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Company Overhead Expenses */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-4">Bill Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {companyExpenses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{c.title}</td>
                    <td className="p-4 font-semibold text-slate-800">{c.category}</td>
                    <td className="p-4 text-xs text-slate-600">{c.work_location}</td>
                    <td className="p-4 text-xs text-slate-500">{c.date}</td>
                    <td className="p-4 text-right font-extrabold text-blue-600">₹{c.amount.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        {c.payment_status || 'Paid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD TRAVEL CLAIM MODAL */}
      {showTravelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Add Employee Reimbursement Claim</h2>
              <button onClick={() => setShowTravelModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddTravel} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Select Employee</label>
                <select value={newTravel.employee_id} onChange={e => setNewTravel({...newTravel, employee_id: e.target.value})} className="w-full p-2 text-sm border rounded-lg">
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.work_location})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Claim Category</label>
                  <input type="text" value={newTravel.claim_type} onChange={e => setNewTravel({...newTravel, claim_type: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Total Claim Amount (₹)</label>
                  <input type="number" required value={newTravel.total_amount} onChange={e => setNewTravel({...newTravel, total_amount: e.target.value})} className="w-full p-2 text-sm border rounded-lg font-bold text-blue-600" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Purpose / Description</label>
                <textarea rows="2" value={newTravel.purpose} onChange={e => setNewTravel({...newTravel, purpose: e.target.value})} className="w-full p-2 text-sm border rounded-lg" placeholder="Client visit, travel tickets..." />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowTravelModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-md shadow-blue-600/30">Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD COMPANY OVERHEAD MODAL */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Record Company Overhead Bill</h2>
              <button onClick={() => setShowCompanyModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddCompany} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Bill Title</label>
                <input type="text" required placeholder="Office Rent July 2026" value={newCompany.title} onChange={e => setNewCompany({...newCompany, title: e.target.value})} className="w-full p-2 text-sm border rounded-lg font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600">Category</label>
                  <input type="text" value={newCompany.category} onChange={e => setNewCompany({...newCompany, category: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Amount (₹)</label>
                  <input type="number" required value={newCompany.amount} onChange={e => setNewCompany({...newCompany, amount: e.target.value})} className="w-full p-2 text-sm border rounded-lg font-bold text-blue-600" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowCompanyModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg shadow-md shadow-indigo-600/30">Save Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
