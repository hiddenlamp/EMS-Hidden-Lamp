import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-house' },
    { label: 'Employees', path: '/employees', icon: 'fa-solid fa-users' },
    { label: 'Payroll', path: '/payroll', icon: 'fa-solid fa-money-check-dollar' },
    { label: 'Payslip', path: '/payslips', icon: 'fa-solid fa-file-invoice' },
    { label: 'Receipts & Expenses', path: '/expenses', icon: 'fa-solid fa-receipt' },
    { label: 'Loans & Advances', path: '/loans', icon: 'fa-solid fa-hand-holding-dollar' },
    { label: 'Report and Analytics', path: '/analytics', icon: 'fa-solid fa-chart-line' },
    { label: 'Audit & Security Logs', path: '/audit-logs', icon: 'fa-solid fa-shield-halved' },
  ];

  return (
    <aside className="sidebar">
      <NavLink to="/dashboard" className="brand">
        <img 
          src="/images/logo.png" 
          alt="Hidden Lamp Logo" 
          style={{ height: '38px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }} 
        />
        <div>
          <span className="brand-title">HIDDEN LAMP</span>
          <span className="brand-subtitle">Payroll Management</span>
        </div>
      </NavLink>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <i className={item.icon}></i> {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="upgrade-card">
          <h4>
            <i className="fa-solid fa-rocket" style={{ marginBottom: '8px', fontSize: '1.5rem', display: 'block' }}></i>
            System Info
          </h4>
          <p>Self-Hosted Enterprise Edition. Secure & encrypted.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
