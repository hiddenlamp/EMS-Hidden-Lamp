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
    <div className="login-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #090d16 100%)', padding: '1.5rem' }}>
      <div className="login-card" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', width: '100%', maxWidth: '440px', borderRadius: '16px', boxShadow: '0 16px 32px -8px rgba(15, 23, 42, 0.25)', padding: '2.5rem', border: '1px solid rgba(255, 255, 255, 0.8)' }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/images/logo.png" 
            alt="Hidden Lamp Logo" 
            style={{ height: '64px', borderRadius: '12px', marginBottom: '0.85rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.4)' }} 
          />
          <h1 className="login-title" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>HIDDEN LAMP</h1>
          <p className="login-subtitle" style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>Enterprise Payroll & Executive Portal</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding: '0.85rem 1.15rem', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fca5a5', marginBottom: '1.5rem', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className="fa-solid fa-triangle-exclamation"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="email" className="form-label" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
              <i className="fa-regular fa-envelope" style={{ color: '#2563eb', marginRight: '0.4rem' }}></i> Corporate Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-user-shield" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem' }}></i>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-control"
                placeholder="name@company.com"
                required
                autoFocus
                style={{ width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="password" className="form-label" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
              <i className="fa-solid fa-lock" style={{ color: '#2563eb', marginRight: '0.4rem' }}></i> Password
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-key" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.9rem' }}></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                placeholder="Enter your password"
                required
                style={{ width: '100%', padding: '0.65rem 2.6rem 0.65rem 2.6rem', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}
                title="Show/Hide Password"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
              <input type="checkbox" name="remember" style={{ accentColor: '#2563eb', borderRadius: '4px' }} /> Remember session
            </label>
            <a href="javascript:void(0)" onClick={() => alert('Please contact your IT Systems Administrator to reset your enterprise password.')} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Forgot Password?</a>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontWeight: 700, fontSize: '0.95rem', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', border: 'none', borderRadius: '9999px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <i className="fa-solid fa-shield-halved"></i> {submitting ? 'Authenticating...' : 'Sign In to Executive Portal'}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.76rem', fontWeight: 500, borderTop: '1px solid #e2e8f0', paddingTop: '1.1rem' }}>
          <i className="fa-solid fa-lock" style={{ color: '#059669', marginRight: '0.3rem' }}></i> 256-Bit SSL Encrypted Enterprise Session
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
