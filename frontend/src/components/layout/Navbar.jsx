import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const userName = user?.email ? user.email.split('@')[0] : 'Admin';

  return (
    <div className="topbar">
      <div className="topbar-search">
        <i className="fa-solid fa-search"></i>
        <input type="text" placeholder="Search now..." />
      </div>
      <div className="topbar-profile">
        <div className="user-email">Welcome back, {userName} 👋</div>
        <div className="avatar">
          <i className="fa-regular fa-user"></i>
        </div>
        <button 
          onClick={logout} 
          className="logout-icon" 
          title="Sign out"
          type="button"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>
  );
};

export default Navbar;
