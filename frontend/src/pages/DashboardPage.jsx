import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#2563eb' }}></i>
        <p>Loading Dashboard statistics...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Dashboard (July 2026 Register)</h1>
          <p className="page-description">Welcome back! Manage location-wise employee heads, salary budgets, and monthly payroll processing.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/employees" className="btn btn-secondary">+ Add Employee</Link>
          <Link to="/payroll" className="btn btn-primary">Process Payroll Run</Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card bg-pastel-green">
          <div className="metric-icon"><i className="fa-solid fa-users"></i></div>
          <div>
            <div className="metric-value">{data?.activeCount || 0}</div>
            <div className="metric-label">Total Employee Heads</div>
          </div>
        </div>

        <div className="metric-card bg-pastel-purple">
          <div className="metric-icon"><i className="fa-solid fa-map-location-dot"></i></div>
          <div>
            <div className="metric-value">{data?.locationCount || 0}</div>
            <div className="metric-label">Locations Covered</div>
          </div>
        </div>

        <div className="metric-card bg-pastel-orange">
          <div className="metric-icon"><i className="fa-solid fa-indian-rupee-sign"></i></div>
          <div>
            <div className="metric-value">₹{(data?.totalBudget || 0).toLocaleString('en-IN')}</div>
            <div className="metric-label">Monthly Salary Budget</div>
          </div>
        </div>

        <div className="metric-card bg-pastel-blue">
          <div className="metric-icon"><i className="fa-solid fa-file-invoice-dollar"></i></div>
          <div>
            <div className="metric-value">{data?.runCount || 0}</div>
            <div className="metric-label">Total Payroll Runs</div>
          </div>
        </div>
      </div>

      {/* Grid: Location Summary & Recent Runs */}
      <div className="form-grid" style={{ gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Place-Wise Summary */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Place-Wise Summary (Hidden Lamp)</h2>
            <Link to="/employees" className="btn btn-sm btn-secondary">View Register</Link>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Sl.</th>
                  <th>Location</th>
                  <th style={{ textAlign: 'center' }}>Heads</th>
                  <th style={{ textAlign: 'right' }}>Monthly Budget</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.locationSummary?.map((loc, idx) => (
                  <tr key={loc.work_location}>
                    <td>{idx + 1}</td>
                    <td><strong>{loc.work_location}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>{loc.heads}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                      ₹{(loc.location_budget || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/employees?location=${encodeURIComponent(loc.work_location)}`} className="btn btn-sm btn-secondary">Details</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan="2">GRAND TOTAL</td>
                  <td style={{ textAlign: 'center', color: '#2563eb' }}>{data?.activeCount || 0}</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>₹{(data?.totalBudget || 0).toLocaleString('en-IN')}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Recent Payroll Runs */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Payroll Runs</h2>
            <Link to="/payroll" className="btn btn-sm btn-secondary">View All</Link>
          </div>

          {data?.recentRuns?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No payroll runs created yet. Click <strong>Process Payroll Run</strong> to process the July 2026 cycle.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Pay Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentRuns?.map(run => (
                    <tr key={run.id}>
                      <td><strong>{run.period}</strong></td>
                      <td>{run.pay_date}</td>
                      <td>
                        <span className={`badge badge-${run.status}`}>{run.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/payroll/${run.id}`} className="btn btn-sm btn-secondary">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
