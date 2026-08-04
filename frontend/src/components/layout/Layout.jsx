import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content">
        <Navbar />
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
