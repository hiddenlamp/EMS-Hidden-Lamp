import React, { useState, useEffect } from 'react';

export default function LoansPage() {
  const [loans, setLoans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [totalDisbursed, setTotalDisbursed] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalRepaid, setTotalRepaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    loan_type: 'Salary Advance',
    loan_amount: '',
    monthly_emi: '',
    disbursed_date: new Date().toISOString().substring(0, 10),
    notes: ''
  });

  const API_BASE = window.API_BASE_URL || '/api';

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/loans`, { credentials: 'include' });
      const data = await res.json();
      if (data.loans) {
        setLoans(data.loans);
        setEmployees(data.employees || []);
        setTotalDisbursed(data.totalLoansDisbursed || 0);
        setTotalOutstanding(data.totalOutstanding || 0);
        setTotalRepaid(data.totalRepaid || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Loan disbursed successfully!');
        setShowModal(false);
        setFormData({
          employee_id: '',
          loan_type: 'Salary Advance',
          loan_amount: '',
          monthly_emi: '',
          disbursed_date: new Date().toISOString().substring(0, 10),
          notes: ''
        });
        fetchLoans();
      } else {
        setErrorMsg(data.error || 'Failed to disburse loan');
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete loan record permanently?')) return;
    try {
      await fetch(`${API_BASE}/loans/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchLoans();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Employee Loans & Salary Advances</h1>
          <p className="text-sm text-slate-500">Manage employee loans, salary advances, and monthly EMI deductions.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow transition"
        >
          + Issue New Loan / Advance
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium text-sm">
          ✅ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <div className="text-xs font-bold text-purple-600 uppercase">Total Disbursed</div>
          <div className="text-2xl font-black text-purple-900 mt-1">₹{totalDisbursed.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="text-xs font-bold text-blue-600 uppercase">Outstanding Balance</div>
          <div className="text-2xl font-black text-blue-900 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <div className="text-xs font-bold text-emerald-600 uppercase">Amount Recovered</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">₹{totalRepaid.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <div className="text-xs font-bold text-amber-600 uppercase">Active Accounts</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{loans.filter(l => l.status === 'Active').length}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Loan Accounts Directory</h2>

        {loading ? (
          <div className="py-8 text-center text-slate-500 font-medium">Loading loan accounts...</div>
        ) : loans.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-medium">No loans or advances recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Loan Type</th>
                  <th className="p-3 text-right">Sanctioned</th>
                  <th className="p-3 text-right">Monthly EMI</th>
                  <th className="p-3 text-right">Recovered</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{l.employee_name}</div>
                      <div className="text-xs text-slate-500">{l.work_location}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-200">
                        {l.loan_type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">₹{l.loan_amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-blue-600">₹{l.monthly_emi.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">₹{l.repaid_amount.toLocaleString('en-IN')}</td>
                    <td className={`p-3 text-right font-black ${l.remaining_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{l.remaining_balance.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${l.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(l.id)} className="px-2 py-1 text-xs text-rose-600 border border-rose-200 hover:bg-rose-50 rounded">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Issue Loan / Salary Advance</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Select Employee *</label>
                <select
                  value={formData.employee_id}
                  onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.work_location})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Loan Type</label>
                  <select
                    value={formData.loan_type}
                    onChange={e => setFormData({ ...formData, loan_type: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="Salary Advance">Salary Advance</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Emergency Loan">Emergency Loan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Disbursed Date</label>
                  <input
                    type="date"
                    value={formData.disbursed_date}
                    onChange={e => setFormData({ ...formData, disbursed_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Loan Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={formData.loan_amount}
                    onChange={e => setFormData({ ...formData, loan_amount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    placeholder="2000"
                    value={formData.monthly_emi}
                    onChange={e => setFormData({ ...formData, monthly_emi: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Disburse</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
