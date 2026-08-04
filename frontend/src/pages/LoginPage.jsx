import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="login-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
      <div className="login-card">
        <div className="login-header">
          <img 
            src="/images/logo.png" 
            alt="Hidden Lamp Logo" 
            style={{ height: '60px', borderRadius: '10px', marginBottom: '0.75rem', boxShadow: 'var(--shadow)' }} 
          />
          <h1 className="login-title">HIDDEN LAMP</h1>
          <p className="login-subtitle">Employee Payroll Management System</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding: '0.75rem', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              placeholder="name@hiddenlamp.com"
              required
              autoFocus
              style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: '700' }}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
