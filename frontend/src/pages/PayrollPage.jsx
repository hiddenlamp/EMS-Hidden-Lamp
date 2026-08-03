import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Calendar, Plus, Calculator, CheckCircle2, Send, Eye, X } from 'lucide-react';

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

  // Create form state
  const [newRun, setNewRun] = useState({
    period: '2026-08',
    pay_date: '2026-08-31'
  });

  const fetchRuns = async () => {
    try {
      const res = await api.get('/payroll');
      setRuns(res.data.runs);
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
      res.data.payslips.forEach(ps => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Monthly Payroll Run Processing</h1>
          <p className="text-sm text-slate-500">Create payroll runs, calculate LOP deductions, and issue approved payslips.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Payroll Run</span>
        </button>
      </div>

      {/* Runs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-4">Period</th>
                <th className="p-4">Pay Date</th>
                <th className="p-4">Total Payslips</th>
                <th className="p-4 text-right">Disbursed Net Pay</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{run.period}</td>
                  <td className="p-4 text-slate-600">{run.pay_date}</td>
                  <td className="p-4 font-semibold text-slate-800">{run.total_payslips} Generated</td>
                  <td className="p-4 text-right font-extrabold text-blue-600">₹{run.total_net_disbursed.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      run.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {run.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => openRunModal(run)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Manage Run</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RUN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Initiate New Payroll Run</h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateRun} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600">Payroll Period (YYYY-MM)</label>
                <input type="text" required placeholder="2026-08" value={newRun.period} onChange={e => setNewRun({...newRun, period: e.target.value})} className="w-full p-2.5 text-sm border rounded-lg font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Pay Disbursal Date</label>
                <input type="date" required value={newRun.pay_date} onChange={e => setNewRun({...newRun, pay_date: e.target.value})} className="w-full p-2.5 text-sm border rounded-lg font-medium" />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg shadow-md shadow-blue-600/30">Create Draft Run</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE PAYROLL RUN MODAL */}
      {showRunModal && selectedRun && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] rounded-2xl p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Payroll Run Details: {selectedRun.period}</h2>
                <p className="text-xs text-slate-500">Pay Date: {selectedRun.pay_date} | Status: <span className="font-bold text-blue-600 uppercase">{selectedRun.status}</span></p>
              </div>
              <button onClick={() => setShowRunModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {/* Run Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedRun.status === 'draft' && (
                <>
                  <button onClick={handleCalculatePayroll} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5">
                    <Calculator className="w-4 h-4" />
                    <span>Calculate Payroll LOP</span>
                  </button>
                  <button onClick={handleApproveRun} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Lock Run</span>
                  </button>
                </>
              )}
            </div>

            {/* LOP Table & Generated Payslips */}
            <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b text-[11px] uppercase">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">LOP Days Input</th>
                    <th className="p-3 text-right">Gross Pay</th>
                    <th className="p-3 text-right">Deductions</th>
                    <th className="p-3 text-right">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {activeEmps.map(emp => {
                    const ps = runPayslips.find(p => p.employee_id === emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.work_location}</p>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            disabled={selectedRun.status === 'approved'}
                            value={lopInputs[emp.id] !== undefined ? lopInputs[emp.id] : 0}
                            onChange={e => setLopInputs({...lopInputs, [emp.id]: parseFloat(e.target.value) || 0})}
                            className="w-20 p-1.5 border rounded-md text-xs font-bold text-center"
                          />
                        </td>
                        <td className="p-3 text-right text-emerald-600 font-semibold">₹{ps ? ps.gross_pay.toLocaleString('en-IN') : '-'}</td>
                        <td className="p-3 text-right text-red-600 font-semibold">₹{ps ? ps.total_deductions.toLocaleString('en-IN') : '-'}</td>
                        <td className="p-3 text-right font-extrabold text-blue-600">₹{ps ? ps.net_pay.toLocaleString('en-IN') : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <button onClick={() => setShowRunModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;
