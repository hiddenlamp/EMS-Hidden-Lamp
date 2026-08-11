import React, { useState, useEffect } from 'react';

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState('company_loans');
  const [companyLoans, setCompanyLoans] = useState([]);
  const [fundRotations, setFundRotations] = useState([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [outstandingDebt, setOutstandingDebt] = useState(0);
  const [totalRotated, setTotalRotated] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editingRotation, setEditingRotation] = useState(null);

  const [loanForm, setLoanForm] = useState({
    lender_name: '',
    lender_type: 'Bank / NBFC',
    project_name: 'Gomia Project Site',
    principal_amount: '',
    interest_rate: '0',
    disbursed_date: new Date().toISOString().substring(0, 10),
    due_date: '',
    notes: ''
  });

  const [rotationForm, setRotationForm] = useState({
    source_pool: 'Main Corporate Treasury',
    destination_project: 'Gomia Project Site',
    rotation_purpose: 'Working Capital Rotation',
    amount: '',
    transfer_date: new Date().toISOString().substring(0, 10),
    reference_no: '',
    managed_by: '',
    notes: ''
  });

  const API_BASE = window.API_BASE_URL || '/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resLoans, resRot] = await Promise.all([
        fetch(`${API_BASE}/company-loans`, { credentials: 'include' }),
        fetch(`${API_BASE}/fund-rotations`, { credentials: 'include' })
      ]);
      const dataLoans = await resLoans.json();
      const dataRot = await resRot.json();

      if (dataLoans.loans) {
        setCompanyLoans(dataLoans.loans);
        setTotalDebt(dataLoans.totalDebt || 0);
        setOutstandingDebt(dataLoans.outstandingDebt || 0);
      }
      if (dataRot.rotations) {
        setFundRotations(dataRot.rotations);
        setTotalRotated(dataRot.totalRotated || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    const url = editingLoan ? `${API_BASE}/company-loans/${editingLoan.id}` : `${API_BASE}/company-loans`;
    const method = editingLoan ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanForm),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setShowLoanModal(false);
        setEditingLoan(null);
        setLoanForm({
          lender_name: '',
          lender_type: 'Bank / NBFC',
          project_name: 'Gomia Project Site',
          principal_amount: '',
          interest_rate: '0',
          disbursed_date: new Date().toISOString().substring(0, 10),
          due_date: '',
          notes: ''
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRotation = async (e) => {
    e.preventDefault();
    const url = editingRotation ? `${API_BASE}/fund-rotations/${editingRotation.id}` : `${API_BASE}/fund-rotations`;
    const method = editingRotation ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rotationForm),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setShowRotationModal(false);
        setEditingRotation(null);
        setRotationForm({
          source_pool: 'Main Corporate Treasury',
          destination_project: 'Gomia Project Site',
          rotation_purpose: 'Working Capital Rotation',
          amount: '',
          transfer_date: new Date().toISOString().substring(0, 10),
          reference_no: '',
          managed_by: '',
          notes: ''
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditLoan = (l) => {
    setEditingLoan(l);
    setLoanForm({
      lender_name: l.lender_name,
      lender_type: l.lender_type,
      project_name: l.project_name,
      principal_amount: l.principal_amount,
      interest_rate: l.interest_rate || '0',
      disbursed_date: l.disbursed_date,
      due_date: l.due_date || '',
      notes: l.notes || ''
    });
    setShowLoanModal(true);
  };

  const openEditRotation = (r) => {
    setEditingRotation(r);
    setRotationForm({
      source_pool: r.source_pool,
      destination_project: r.destination_project,
      rotation_purpose: r.rotation_purpose,
      amount: r.amount,
      transfer_date: r.transfer_date,
      reference_no: r.reference_no || '',
      managed_by: r.managed_by || '',
      notes: r.notes || ''
    });
    setShowRotationModal(true);
  };

  const handleDeleteLoan = async (id) => {
    if (!window.confirm('Delete this corporate loan record?')) return;
    try {
      await fetch(`${API_BASE}/company-loans/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRotation = async (id) => {
    if (!window.confirm('Delete this fund rotation record?')) return;
    try {
      await fetch(`${API_BASE}/fund-rotations/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Corporate Loans & Fund Rotations</h1>
          <p className="text-sm text-slate-500">Manage company borrowings, marketplace credit lines, and inter-project capital transfers.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/loans/export/company-loans"
            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1"
          >
            📥 Export Loans CSV
          </a>
          <a
            href="/loans/export/fund-rotations"
            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-xs shadow-sm flex items-center gap-1"
          >
            📥 Export Rotations CSV
          </a>
          <button
            onClick={() => { setEditingLoan(null); setShowLoanModal(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow transition"
          >
            + Add Corporate Loan
          </button>
          <button
            onClick={() => { setEditingRotation(null); setShowRotationModal(true); }}
            className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-sm shadow-sm transition"
          >
            + Record Fund Rotation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <div className="text-xs font-bold text-purple-600 uppercase">Sanctioned Debt</div>
          <div className="text-2xl font-black text-purple-900 mt-1">₹{totalDebt.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
          <div className="text-xs font-bold text-rose-600 uppercase">Outstanding Balance</div>
          <div className="text-2xl font-black text-rose-900 mt-1">₹{outstandingDebt.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <div className="text-xs font-bold text-emerald-600 uppercase">Capital Rotated</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">₹{totalRotated.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <div className="text-xs font-bold text-amber-600 uppercase">Active Rotations</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{fundRotations.filter(r => r.status === 'In Rotation').length}</div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('company_loans')}
          className={`px-4 py-2 font-bold text-sm rounded-t-lg transition ${activeTab === 'company_loans' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          🏦 Corporate Loans & Credit Lines ({companyLoans.length})
        </button>
        <button
          onClick={() => setActiveTab('fund_rotations')}
          className={`px-4 py-2 font-bold text-sm rounded-t-lg transition ${activeTab === 'fund_rotations' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          🔄 Inter-Project Fund Rotations ({fundRotations.length})
        </button>
      </div>

      {activeTab === 'company_loans' && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Corporate Borrowing Accounts</h2>
          {loading ? (
            <div className="py-8 text-center text-slate-500 font-medium">Loading loans...</div>
          ) : companyLoans.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-medium">No corporate loans or vendor credit lines recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-3">Lender / Vendor</th>
                    <th className="p-3">Credit Type</th>
                    <th className="p-3">Allocated Project</th>
                    <th className="p-3 text-right">Principal</th>
                    <th className="p-3 text-right">Payable</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companyLoans.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{l.lender_name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-200">{l.lender_type}</span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{l.project_name}</td>
                      <td className="p-3 text-right font-bold">₹{l.principal_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-bold text-blue-600">₹{l.total_payable.toLocaleString('en-IN')}</td>
                      <td className={`p-3 text-right font-black ${l.remaining_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ₹{l.remaining_balance.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${l.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditLoan(l)} className="px-2 py-1 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 rounded">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteLoan(l.id)} className="px-2 py-1 text-xs text-rose-600 border border-rose-200 hover:bg-rose-50 rounded">
                            Delete
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
      )}

      {activeTab === 'fund_rotations' && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Inter-Project Fund Transfers & Rotations</h2>
          {loading ? (
            <div className="py-8 text-center text-slate-500 font-medium">Loading fund rotations...</div>
          ) : fundRotations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-medium">No fund rotations recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-3">Source Pool</th>
                    <th className="p-3">Destination Project</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3 text-right">Transferred Amount</th>
                    <th className="p-3 text-right">Settled Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fundRotations.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{r.source_pool}</td>
                      <td className="p-3 font-bold text-blue-600 font-medium">➔ {r.destination_project}</td>
                      <td className="p-3 text-slate-600">{r.rotation_purpose}</td>
                      <td className="p-3 text-right font-black text-slate-900">₹{r.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">₹{r.settled_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${r.status === 'In Rotation' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditRotation(r)} className="px-2 py-1 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 rounded">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteRotation(r.id)} className="px-2 py-1 text-xs text-rose-600 border border-rose-200 hover:bg-rose-50 rounded">
                            Delete
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
      )}

      {showLoanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">{editingLoan ? 'Edit Corporate Loan' : 'Add Corporate Loan / Credit Line'}</h3>
              <button onClick={() => setShowLoanModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateLoan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Lender / Vendor Name *</label>
                <input
                  type="text"
                  placeholder="HDFC Bank, Amazon Credit Line..."
                  value={loanForm.lender_name}
                  onChange={e => setLoanForm({ ...loanForm, lender_name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Lender Type</label>
                  <select
                    value={loanForm.lender_type}
                    onChange={e => setLoanForm({ ...loanForm, lender_type: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="Bank / NBFC">Bank / NBFC</option>
                    <option value="Vendor Credit Line">Vendor Credit Line</option>
                    <option value="Marketplace Advance">Marketplace Advance</option>
                    <option value="Private Investor / Partner">Private Investor / Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Allocated Project</label>
                  <input
                    type="text"
                    value={loanForm.project_name}
                    onChange={e => setLoanForm({ ...loanForm, project_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Principal Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="500000"
                    value={loanForm.principal_amount}
                    onChange={e => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    placeholder="10.5"
                    value={loanForm.interest_rate}
                    onChange={e => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowLoanModal(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">
                  {editingLoan ? 'Save Changes' : 'Save Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRotationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">{editingRotation ? 'Edit Fund Rotation' : 'Record Inter-Project Fund Rotation'}</h3>
              <button onClick={() => setShowRotationModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateRotation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Source Pool / Account *</label>
                <input
                  type="text"
                  placeholder="Main Corporate Treasury, Gomia Site Pool..."
                  value={rotationForm.source_pool}
                  onChange={e => setRotationForm({ ...rotationForm, source_pool: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Destination Project</label>
                  <input
                    type="text"
                    value={rotationForm.destination_project}
                    onChange={e => setRotationForm({ ...rotationForm, destination_project: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Rotation Purpose</label>
                  <input
                    type="text"
                    value={rotationForm.rotation_purpose}
                    onChange={e => setRotationForm({ ...rotationForm, rotation_purpose: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="200000"
                    value={rotationForm.amount}
                    onChange={e => setRotationForm({ ...rotationForm, amount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Transfer Date</label>
                  <input
                    type="date"
                    value={rotationForm.transfer_date}
                    onChange={e => setRotationForm({ ...rotationForm, transfer_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRotationModal(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">
                  {editingRotation ? 'Save Changes' : 'Save Rotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
