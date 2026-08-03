import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Banknote, 
  FileText, 
  Receipt, 
  BarChart3, 
  ShieldCheck,
  Building2
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Employees', path: '/employees', icon: Users },
    { label: 'Payroll', path: '/payroll', icon: Banknote },
    { label: 'Payslips', path: '/payslips', icon: FileText },
    { label: 'Receipts & Expenses', path: '/expenses', icon: Receipt },
    { label: 'Report and Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Audit & Security Logs', path: '/audit-logs', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center space-x-3 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-wide leading-none">HIDDEN LAMP</h1>
          <p className="text-xs text-blue-400 font-medium mt-0.5">Payroll Management</p>
        </div>
      </div>

      {/* Nav Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System info badge */}
      <div className="p-4 m-4 bg-slate-800/60 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Enterprise Edition v2.0</span>
        </div>
        <p className="text-[11px] text-slate-400">Self-hosted React SPA System</p>
      </div>
    </aside>
  );
};

export default Sidebar;
