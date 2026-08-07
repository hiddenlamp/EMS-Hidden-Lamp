import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 60%, #020617 100%)',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      {/* Subtle Ambient Lighting Orbs */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, rgba(0, 0, 0, 0) 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }}></div>

      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, rgba(0, 0, 0, 0) 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none'
      }}></div>

      {/* CENTERED COMPACT SINGLE CARD (100% NON-SCROLLABLE) */}
      <div style={{
        width: '100%',
        maxWidth: '410px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(24px)',
        borderRadius: '20px',
        padding: '2.25rem 2rem',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.5)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img 
            src="/images/logo.png" 
            alt="Hidden Lamp Logo" 
            style={{ height: '56px', borderRadius: '12px', marginBottom: '0.65rem', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', border: '2px solid #ffffff' }} 
          />
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>HIDDEN LAMP</h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>Enterprise Payroll & Operations Portal</p>
        </div>

        {error && (
          <div style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            background: '#fff1f2',
            color: '#e11d48',
            border: '1px solid #fca5a5',
            marginBottom: '1.1rem',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fa-solid fa-circle-exclamation"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>
              <i className="fa-regular fa-envelope" style={{ color: '#2563eb', marginRight: '0.3rem' }}></i> Corporate Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-user-shield" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem' }}></i>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hiddenlamp.com"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem 0.7rem 2.5rem',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>
              <i className="fa-solid fa-lock" style={{ color: '#2563eb', marginRight: '0.3rem' }}></i> Access Password
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-key" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem' }}></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 2.5rem 0.7rem 2.5rem',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}
                title="Show/Hide Password"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.8rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
              <input type="checkbox" name="remember" style={{ accentColor: '#2563eb', borderRadius: '4px' }} /> Remember session
            </label>
            <a href="javascript:void(0)" onClick={() => alert('Please contact your IT Systems Administrator to reset your enterprise password.')} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Forgot Password?</a>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '0.8rem 1.25rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 8px 18px -4px rgba(37, 99, 235, 0.45)',
              marginTop: '1.25rem'
            }}
          >
            <i className="fa-solid fa-shield-halved"></i> {submitting ? 'Authenticating...' : 'Sign In to Executive Portal'}
          </button>
        </form>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '0.65rem 0.85rem',
          marginTop: '1.1rem',
          fontSize: '0.8rem',
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div>
            <i className="fa-solid fa-key" style={{ color: '#16a34a', marginRight: '0.3rem' }}></i>
            <strong>Default Admin:</strong> <span style={{ fontFamily: 'monospace' }}>admin@hiddenlamp.com</span>
          </div>
          <span style={{ background: '#dcfce7', padding: '0.15rem 0.35rem', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace' }}>admin123</span>
        </div>

        <div style={{
          marginTop: '1.25rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#64748b',
          fontWeight: 600
        }}>
          <i className="fa-solid fa-lock" style={{ color: '#059669', marginRight: '0.3rem' }}></i> 256-Bit SSL Encrypted Enterprise Session
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
