import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { BarChart3, Filter, Sparkles, Send, Download, FileSpreadsheet, Building2, MapPin } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [loading, setLoading] = useState(true);

  // AI Assistant state
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiQuerying, setAiQuerying] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/analytics?month=${selectedMonth}&year=${selectedYear}&location=${selectedLocation}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth, selectedYear, selectedLocation]);

  const handleAiAsk = async (e) => {
    e.preventDefault();
    if (!aiQuery) return;
    setAiQuerying(true);
    try {
      const res = await api.post('/analytics/ask', { question: aiQuery });
      setAiResponse(res.data);
    } catch (err) {
      setAiResponse({ error: 'Failed to process data query.' });
    } finally {
      setAiQuerying(false);
    }
  };

  // Chart data setup
  const chartData = {
    labels: data?.payrollTrend?.map(t => t.period) || [],
    datasets: [
      {
        label: 'Net Salary Paid (₹)',
        data: data?.payrollTrend?.map(t => t.net_pay) || [],
        backgroundColor: '#2563eb',
        borderRadius: 6,
      },
      {
        label: 'Total Deductions (₹)',
        data: data?.payrollTrend?.map(t => t.deductions) || [],
        backgroundColor: '#ef4444',
        borderRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & CSV Exporters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Corporate Reports & Business Intelligence</h1>
          <p className="text-sm text-slate-500">Financial analytics across payroll, reimbursement claims, and company overhead.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/analytics/export/payroll-csv" target="_blank" rel="noreferrer" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Payroll CSV</span>
          </a>
          <a href="/api/analytics/export/expenses-csv" target="_blank" rel="noreferrer" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Claims CSV</span>
          </a>
          <a href="/api/analytics/export/company-csv" target="_blank" rel="noreferrer" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Overhead CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-700 mr-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filters:</span>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
        >
          <option value="">⚡ All Months</option>
          {data?.monthNames?.map(m => (
            <option key={m.num} value={m.num}>{m.name}</option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
        >
          <option value="">⚡ All Years</option>
          {data?.years?.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700"
        >
          <option value="all">⚡ All Locations</option>
          {data?.locations?.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Total Net Salary Paid</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">₹{(data?.kpiPayroll?.total_net || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-1">Gross: ₹{(data?.kpiPayroll?.total_gross || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Employee Reimbursements</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">₹{(data?.kpiExpenses?.total_claimed || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-red-500 font-semibold mt-1">Pending Dues: ₹{(data?.kpiExpenses?.total_dues || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Company Operational Overhead</p>
          <p className="text-2xl font-extrabold text-purple-600 mt-1">₹{(data?.kpiCompany?.total_overhead || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-1">Rent, Utilities & Tech</p>
        </div>
      </div>

      {/* Chart & Dept Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Monthly Payroll Disbursal Trend</span>
          </h2>
          <div className="h-72">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Department Wise Spend</span>
          </h2>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto custom-scrollbar">
            {data?.deptSpend?.map(d => (
              <div key={d.department} className="py-2.5 flex justify-between items-center text-sm">
                <div>
                  <p className="font-bold text-slate-800">{d.department}</p>
                  <p className="text-xs text-slate-400">{d.staff_count} Staff</p>
                </div>
                <span className="font-extrabold text-blue-600">₹{(d.total_net || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Smart Query Assistant Card */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Ask AI Data Assistant (Smart Natural Language Query)</h2>
            <p className="text-xs text-blue-200">Ask questions about payroll spend, travel claims, or staff counts in plain English.</p>
          </div>
        </div>

        <form onSubmit={handleAiAsk} className="flex gap-2">
          <input
            type="text"
            placeholder="Ask anything, e.g. 'What is the total gross pay for IT department?'"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
          <button
            type="submit"
            disabled={aiQuerying}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center space-x-2 text-sm transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{aiQuerying ? 'Querying...' : 'Ask AI'}</span>
          </button>
        </form>

        {aiResponse && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 text-sm space-y-2">
            <p className="font-bold text-blue-300">🤖 Assistant Answer:</p>
            <p className="text-slate-100 leading-relaxed">{aiResponse.answer || aiResponse.error}</p>
            {aiResponse.sql && (
              <p className="text-xs font-mono text-slate-400 bg-slate-900/60 p-2 rounded">Generated SQL: {aiResponse.sql}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
