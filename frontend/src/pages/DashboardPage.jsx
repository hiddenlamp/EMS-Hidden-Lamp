import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Users, UserX, Calendar, MapPin, IndianRupee, TrendingUp, Building } from 'lucide-react';

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Executive Payroll Dashboard</h1>
        <p className="text-sm text-slate-500">Real-time overview of active staff, monthly budget allocation, and location spend.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{data?.activeCount || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase">Active Staff</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{data?.exitedCount || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase">Exited Staff</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">₹{(data?.totalBudget || 0).toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase">Monthly Payroll Base</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{data?.locationCount || 0}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase">Active Work Locations</p>
          </div>
        </div>
      </div>

      {/* Grid: Location Budget vs Recent Payroll Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Wise Budget Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <Building className="w-5 h-5 text-blue-600" />
            <span>Location Wise Monthly Payroll Budget</span>
          </h2>
          <div className="space-y-4">
            {data?.locationSummary?.map((loc) => {
              const pct = data.totalBudget > 0 ? ((loc.location_budget / data.totalBudget) * 100).toFixed(1) : 0;
              return (
                <div key={loc.work_location} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-slate-800">{loc.work_location} ({loc.heads} Staff)</span>
                    <span className="text-blue-600">₹{(loc.location_budget || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Payroll Runs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Recent Monthly Payroll Runs</span>
          </h2>
          <div className="divide-y divide-slate-100">
            {data?.recentRuns?.map((run) => (
              <div key={run.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-sm">Period: {run.period}</p>
                  <p className="text-xs text-slate-500">Pay Date: {run.pay_date}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  run.status === 'approved' 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {run.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
