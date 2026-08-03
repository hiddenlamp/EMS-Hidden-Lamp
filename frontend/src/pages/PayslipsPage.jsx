import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Search, FileText, Download, Mail, Eye, X, Printer } from 'lucide-react';

const PayslipsPage = () => {
  const [payslips, setPayslips] = useState([]);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [years, setYears] = useState([]);
  const [monthNames, setMonthNames] = useState([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchPayslips = async () => {
    try {
      const res = await api.get(`/payslips?month=${selectedMonth}&year=${selectedYear}&search=${search}`);
      setPayslips(res.data.payslips);
      setTotalGenerated(res.data.totalGenerated);
      setTotalAmount(res.data.totalAmount);
      setYears(res.data.years || []);
      setMonthNames(res.data.monthNames || []);
    } catch (err) {
      console.error('Failed to fetch payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, [selectedMonth, selectedYear, search]);

  const openPayslipModal = async (ps) => {
    try {
      const res = await api.get(`/payslips/${ps.id}`);
      setSelectedPayslip(res.data.payslip);
      setBreakdown(res.data.breakdown);
      setShowModal(true);
    } catch (err) {
      alert('Failed to load payslip preview.');
    }
  };

  const handleSendEmail = async (ps) => {
    try {
      await api.post(`/payroll/${ps.payroll_run_id}/send-email/${ps.employee_id}`);
      alert(`Payslip email dispatched to registered email!`);
    } catch (err) {
      alert('Failed to send email.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Global Payslip Directory</h1>
        <p className="text-sm text-slate-500">Filter payslips by Month and Year, search staff, view A4 payslips, download PDF, or send email notifications.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
          >
            <option value="">⚡ All Months</option>
            {monthNames.map(m => (
              <option key={m.num} value={m.num}>{m.name}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
          >
            <option value="">⚡ All Years</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee name, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{totalGenerated}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase">Filtered Generated Payslips</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Disbursed Net Salary</p>
          </div>
        </div>
      </div>

      {/* Payslips Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-4">Payslip Ref No</th>
                <th className="p-4">Period</th>
                <th className="p-4">Employee Name</th>
                <th className="p-4 text-right">Gross Pay</th>
                <th className="p-4 text-right">Deductions</th>
                <th className="p-4 text-right">Net Payable</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {payslips.map((ps) => {
                const parts = (ps.period || '2026-07').split('-');
                const mNum = parts.length >= 2 ? String(parts[1]).padStart(2, '0') : '07';
                const yNum = parts[0] || '2026';
                const refNo = `HL/PS/${mNum}-${yNum}/${String(ps.employee_id || 1).padStart(3, '0')}`;
                return (
                  <tr key={ps.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                        {refNo}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{ps.period}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{ps.employee_name}</p>
                      <p className="text-xs text-blue-600 font-semibold">{ps.user_email}</p>
                    </td>
                    <td className="p-4 text-right text-emerald-600 font-semibold">₹{ps.gross_pay.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right text-red-600 font-semibold">₹{ps.total_deductions.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-right font-extrabold text-blue-600">₹{ps.net_pay.toLocaleString('en-IN')}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ps.run_status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ps.run_status === 'approved' ? 'Issued' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => openPayslipModal(ps)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <a
                        href={`/payroll/${ps.payroll_run_id}/payslip/${ps.employee_id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </a>
                      <button
                        onClick={() => handleSendEmail(ps)}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                        title="Dispatch email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYSLIP A4 PREVIEW MODAL */}
      {showModal && breakdown && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full max-h-[90vh] rounded-2xl p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Payslip A4 Document Preview</h2>
                <p className="text-xs text-slate-500">{breakdown.employee?.name} | Period: {breakdown.period}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => window.print()} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4</span>
                </button>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
            </div>

            {/* A4 Payslip Card Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 border rounded-xl space-y-5">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">Hidden Lamp Private Limited</h3>
                    <p className="text-xs text-slate-500">26, UIT Pratap Nagar, Jodhpur Rajasthan, 342001 India</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                      HL/PS/{(breakdown.period || '2026-07').split('-')[1] || '07'}-{(breakdown.period || '2026-07').split('-')[0] || '2026'}/{String(breakdown.employee?.id || 1).padStart(3, '0')}
                    </span>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">Pay Period: {breakdown.period}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-700">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[10px]">Employee Details</p>
                    <p className="font-bold text-slate-900 text-sm">{breakdown.employee?.name}</p>
                    <p>Designation: {breakdown.employee?.designation}</p>
                    <p>Department: {breakdown.employee?.department}</p>
                    <p>Work Location: {breakdown.employee?.work_location}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-right">
                    <p className="text-xs text-emerald-700 font-bold uppercase">Total Net Payable</p>
                    <p className="text-2xl font-extrabold text-slate-900">₹{(breakdown.net_pay || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-emerald-800 font-semibold mt-1">Paid Days: {breakdown.days_present} | LOP Days: {breakdown.days_lop}</p>
                  </div>
                </div>

                <div className="border-t pt-4 text-xs text-right text-slate-600 font-semibold">
                  Amount in Words: <span className="font-bold text-slate-900">{breakdown.net_pay_in_words || 'Rupees Only'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipsPage;
