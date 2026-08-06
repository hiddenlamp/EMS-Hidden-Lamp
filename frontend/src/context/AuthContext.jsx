import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const checkAuth = async (retriesLeft = 10, delay = 2500) => {
    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.authenticated && res.data.user) {
        setUser(res.data.user);
        setIsWakingUp(false);
        setRetryAttempt(0);
      } else {
        localStorage.removeItem('token');
        setUser(null);
        setIsWakingUp(false);
      }
    } catch (err) {
      // Check if error is due to Render Cold Start / Network Timeout / 503 Service Unavailable
      const isNetworkOrServerWaking = !err.response || err.response.status === 503 || err.response.status === 502 || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';

      if (isNetworkOrServerWaking && retriesLeft > 0) {
        setIsWakingUp(true);
        setRetryAttempt(prev => prev + 1);
        console.log(`⏳ Server is waking up from standby... Retrying auth check (${11 - retriesLeft}/10)...`);
        
        setTimeout(() => {
          checkAuth(retriesLeft - 1, delay);
        }, delay);
        return;
      }

      setIsWakingUp(false);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      if (retriesLeft === 10 || !isWakingUp) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      setUser(res.data.user);
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      return res.data;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isWakingUp, retryAttempt, login, logout, checkAuth }}>
      {isWakingUp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backdropFilter: 'blur(8px)',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid rgba(255,255,255,0.15)',
            borderTop: '4px solid #38bdf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem'
          }}></div>
          
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
            ⚡ Server Standby Mode - Waking Up Services...
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '420px', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
            Render Cloud Server sleep mode se wake ho raha hai. Main application kuch hi seconds me load ho jayegi. Please wait...
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            color: '#38bdf8',
            fontWeight: 600
          }}>
            Attempting reconnect... ({retryAttempt}/10)
          </div>

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
