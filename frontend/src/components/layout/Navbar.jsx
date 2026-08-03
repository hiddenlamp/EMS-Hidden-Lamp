import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Search } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-30 flex items-center justify-between px-6 shadow-sm">
      {/* Search Input Placeholder */}
      <div className="relative w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Quick search..." 
          className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Right User Controls */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-slate-700">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center border border-blue-200">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block">
            <p className="font-semibold text-slate-800 leading-tight">Welcome, {user?.email?.split('@')[0] || 'Admin'}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role || 'administrator'}</p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
