import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('payroll');
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

  const handleAiAsk = async (e, customQuery) => {
    if (e) e.preventDefault();
    const query = customQuery || aiQuery;
    if (!query) return;
    setAiQuerying(true);
    try {
      const res = await api.post('/analytics/ask', { question: query });
      setAiResponse(res.data);
    } catch (err) {
      setAiResponse({ error: 'Failed to process data query.' });
    } finally {
      setAiQuerying(false);
    }
  };

  // Chart setup
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
    plugins: { legend: { position: 'top' } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Corporate Reports & Business Intelligence</h1>
          <p className="page-description">Comprehensive financial analytics across payroll, employee reimbursement claims, and company overhead.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a href="/api/analytics/export/payroll-csv" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <i className="fa-solid fa-file-csv"></i> Download Payroll CSV
          </a>
          <a href="/api/analytics/export/expenses-csv" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <i className="fa-solid fa-file-csv"></i> Download Claims CSV
          </a>
          <a href="/api/analytics/export/company-csv" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <i className="fa-solid fa-file-csv"></i> Download Overhead CSV
          </a>
          <button type="button" className="btn btn-primary" onClick={() => window.print()} style={{ fontSize: '0.85rem' }}>
            <i className="fa-solid fa-print"></i> Print Executive Summary
          </button>
        </div>
      </div>

      {/* MONTH, YEAR & LOCATION FILTER BAR */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
              <i className="fa-solid fa-calendar-days" style={{ color: 'var(--accent)' }}></i> Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
            >
              <option value="">⚡ All Months</option>
              {data?.monthNames?.map(m => (
                <option key={m.num} value={m.num}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
              <i className="fa-solid fa-calendar" style={{ color: 'var(--accent)' }}></i> Select Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
            >
              <option value="">⚡ All Years</option>
              {data?.years?.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1.2, minWidth: '160px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
              <i className="fa-solid fa-location-dot" style={{ color: 'var(--accent)' }}></i> Work Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.9rem' }}
            >
              <option value="all">⚡ All Locations</option>
              {data?.locations?.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {(selectedMonth || selectedYear || (selectedLocation && selectedLocation !== 'all')) && (
            <button
              onClick={() => { setSelectedMonth(''); setSelectedYear(''); setSelectedLocation('all'); }}
              className="btn btn-secondary"
              style={{ fontSize: '0.88rem', fontWeight: 600 }}
            >
              ✖ Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* TOP METRIC KPI DASHBOARD CARDS */}
      <div className="metrics-grid">
        <div className="metric-card bg-pastel-blue">
          <div className="metric-icon"><i className="fa-solid fa-money-check-dollar"></i></div>
          <div>
            <div className="metric-value">₹{(data?.kpiPayroll?.total_net || 0).toLocaleString('en-IN')}</div>
            <div className="metric-label">Total Distributed Net Salary</div>
            <small style={{ color: '#64748b' }}>Gross: ₹{(data?.kpiPayroll?.total_gross || 0).toLocaleString('en-IN')}</small>
          </div>
        </div>

        <div className="metric-card bg-pastel-green">
          <div className="metric-icon"><i className="fa-solid fa-receipt"></i></div>
          <div>
            <div className="metric-value">₹{(data?.kpiExpenses?.total_claimed || 0).toLocaleString('en-IN')}</div>
            <div className="metric-label">Employee Expense Claims</div>
            <small style={{ color: '#047857', fontWeight: 600 }}>Paid: ₹{(data?.kpiExpenses?.total_paid || 0).toLocaleString('en-IN')}</small>
          </div>
        </div>

        <div className="metric-card bg-pastel-red" style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
          <div className="metric-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}><i className="fa-solid fa-scale-unbalanced"></i></div>
          <div>
            <div className="metric-value" style={{ color: '#be123c' }}>₹{(data?.kpiExpenses?.total_dues || 0).toLocaleString('en-IN')}</div>
            <div className="metric-label" style={{ color: '#9f1239' }}>Total Accrued Balance Dues</div>
            <small style={{ color: '#be123c' }}>Pending Payouts</small>
          </div>
        </div>

        <div className="metric-card bg-pastel-orange">
          <div className="metric-icon"><i className="fa-solid fa-building"></i></div>
          <div>
            <div className="metric-value">₹{(data?.kpiCompany?.total_overhead || 0).toLocaleString('en-IN')}</div>
            <div className="metric-label">Company Operational Overhead</div>
            <small style={{ color: '#9a3412' }}>Utilities, Rent & Tech</small>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION SWITCHER */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('payroll')} className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontWeight: 600, fontSize: '0.88rem' }}>
            <i className="fa-solid fa-chart-column"></i> Payroll & Salary Analytics
          </button>
          <button onClick={() => setActiveTab('expenses')} className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontWeight: 600, fontSize: '0.88rem' }}>
            <i className="fa-solid fa-plane-circle-check"></i> Employee Expense Claims
          </button>
          <button onClick={() => setActiveTab('company')} className={`btn ${activeTab === 'company' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontWeight: 600, fontSize: '0.88rem' }}>
            <i className="fa-solid fa-landmark"></i> Company Overhead
          </button>
          <button onClick={() => setActiveTab('ai')} className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontWeight: 600, fontSize: '0.88rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none' }}>
            <i className="fa-solid fa-sparkles"></i> Ask AI Data Assistant
          </button>
        </div>
      </div>

      {/* TAB 1: PAYROLL ANALYTICS */}
      {activeTab === 'payroll' && (
        <>
          <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start', marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title"><i className="fa-solid fa-chart-line" style={{ color: 'var(--accent)' }}></i> Monthly Payroll Disbursal Trend</h2>
              </div>
              <div style={{ height: '320px' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title"><i className="fa-solid fa-sitemap" style={{ color: 'var(--accent)' }}></i> Department Wise Payroll Spend</h2>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Headcount</th>
                      <th style={{ textAlign: 'right' }}>Total Spend (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.deptSpend?.map(d => (
                      <tr key={d.department}>
                        <td><strong>{d.department}</strong></td>
                        <td>{d.staff_count} Staff</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>₹{(d.total_net || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title"><i className="fa-solid fa-location-dot" style={{ color: 'var(--accent)' }}></i> Location Wise Payroll Breakdown</h2>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Work Location</th>
                    <th>Staff Count</th>
                    <th style={{ textAlign: 'right' }}>Gross Pay (₹)</th>
                    <th style={{ textAlign: 'right' }}>Deductions (₹)</th>
                    <th style={{ textAlign: 'right' }}>Net Salary Paid (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.locationSpend?.map(l => (
                    <tr key={l.work_location}>
                      <td><strong>{l.work_location}</strong></td>
                      <td>{l.staff_count} Staff</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>₹{(l.total_gross || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626' }}>₹{(l.total_deductions || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>₹{(l.total_net || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 4: ASK AI DATA ASSISTANT */}
      {activeTab === 'ai' && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(to right, #eff6ff, #f8fafc)', border: '1px solid #bfdbfe' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', paddingBottom: '0.5rem' }}>
            <h2 className="card-title" style={{ color: '#1e40af' }}><i className="fa-solid fa-sparkles"></i> Ask Your Data Assistant (Smart Query Engine)</h2>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.2rem 0 0 0' }}>Ask questions about salary, travel expenses, company bills, or staff counts in plain English.</p>
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setAiQuery('What is the total gross pay for IT department?'); handleAiAsk(null, 'What is the total gross pay for IT department?'); }} style={{ fontSize: '0.78rem', background: '#fff', borderColor: '#cbd5e1' }}>
              💡 Total gross pay for IT department
            </button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setAiQuery('Show top 5 highest paid employees'); handleAiAsk(null, 'Show top 5 highest paid employees'); }} style={{ fontSize: '0.78rem', background: '#fff', borderColor: '#cbd5e1' }}>
              💡 Top 5 highest paid employees
            </button>
          </div>

          <form onSubmit={e => handleAiAsk(e)} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="Ask anything, e.g. 'Show total net pay in Hazaribagh location'"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.95rem', background: '#fff', flex: 1 }}
              required
            />
            <button type="submit" disabled={aiQuerying} className="btn btn-primary" style={{ fontWeight: 600, padding: '0.6rem 1.25rem' }}>
              <i className="fa-solid fa-paper-plane"></i> {aiQuerying ? 'Querying...' : 'Ask Assistant'}
            </button>
          </form>

          {aiResponse && (
            <div style={{ marginTop: '1.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-robot" style={{ color: '#2563eb' }}></i> Assistant Answer:
              </h3>
              <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {aiResponse.answer || aiResponse.error}
              </div>
              {aiResponse.sql && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px' }}>
                  Generated SQL: {aiResponse.sql}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
