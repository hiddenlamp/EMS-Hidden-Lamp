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
      minHeight: '100vh',
      width: '100%',
      background: 'radial-gradient(circle at 15% 15%, #1e1b4b 0%, #0f172a 45%, #020617 100%)',
      fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Ambient Lighting Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(0, 0, 0, 0) 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }}></div>

      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-5%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(129, 140, 248, 0.25) 0%, rgba(0, 0, 0, 0) 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none'
      }}></div>

      <div style={{
        width: '100%',
        maxWidth: '1060px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '2.5rem',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        {/* LEFT PANEL: Hero Showcase */}
        <div style={{ color: '#ffffff', padding: '1rem 0.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '0.4rem 0.9rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#38bdf8',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '1.25rem',
            backdropFilter: 'blur(10px)'
          }}>
            <i className="fa-solid fa-bolt"></i> Hidden Lamp Executive Suite
          </div>

          <h1 style={{
            fontSize: '2.35rem',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Next-Gen Employee Payroll & Operations Portal
          </h1>

          <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
            Enterprise platform for automated salary calculations, multi-city project expense tracking, and real-time compliance management.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0.9rem 1.1rem',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0
              }}><i className="fa-solid fa-file-invoice-dollar"></i></div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: '#f8fafc', marginBottom: '0.15rem' }}>
                  Automated Payroll & Payslip Dispatch
                </strong>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  1-Click salary calculations, LOP prorating, and instant PDF email dispatch to staff.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0.9rem 1.1rem',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0
              }}><i className="fa-solid fa-diagram-project"></i></div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: '#f8fafc', marginBottom: '0.15rem' }}>
                  City-Wise Project Expense Tracking
                </strong>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  Itemized project material receipts, vendor bills, and employee travel reimbursement ledgers.
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0.9rem 1.1rem',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0
              }}><i className="fa-solid fa-shield-halved"></i></div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: '#f8fafc', marginBottom: '0.15rem' }}>
                  Bank-Grade Security & Audit Logging
                </strong>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  256-Bit SSL encryption with 30-day persistent session security and audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Glassmorphic Login Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(24px)',
          borderRadius: '20px',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.6)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <img 
              src="/images/logo.png" 
              alt="Hidden Lamp Logo" 
              style={{ height: '60px', borderRadius: '12px', marginBottom: '0.75rem', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', border: '2px solid #ffffff' }} 
            />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>HIDDEN LAMP</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>Enterprise Payroll & Executive Portal</p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', border: '1px solid #fca5a5', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem' }}>
                <i className="fa-regular fa-envelope" style={{ color: '#2563eb', marginRight: '0.35rem' }}></i> Corporate Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-user-shield" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.95rem' }}></i>
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
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    fontSize: '0.92rem',
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

            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.45rem' }}>
                <i className="fa-solid fa-lock" style={{ color: '#2563eb', marginRight: '0.35rem' }}></i> Access Password
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-key" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.95rem' }}></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                    fontSize: '0.92rem',
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
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.95rem' }}
                  title="Show/Hide Password"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.82rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" name="remember" style={{ accentColor: '#2563eb', borderRadius: '4px' }} /> Remember session
              </label>
              <a href="javascript:void(0)" onClick={() => alert('Please contact your IT Systems Administrator to reset your enterprise password.')} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Forgot Password?</a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.85rem 1.5rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)',
                marginTop: '1.5rem'
              }}
            >
              <i className="fa-solid fa-shield-halved"></i> {submitting ? 'Authenticating...' : 'Sign In to Executive Portal'}
            </button>
          </form>

          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginTop: '1.25rem',
            fontSize: '0.82rem',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <div>
              <i className="fa-solid fa-key" style={{ color: '#16a34a', marginRight: '0.35rem' }}></i>
              <strong>Default Admin:</strong> <span style={{ fontFamily: 'monospace' }}>admin@hiddenlamp.com</span>
            </div>
            <span style={{ background: '#dcfce7', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace' }}>admin123</span>
          </div>

          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
            fontSize: '0.76rem',
            color: '#64748b',
            fontWeight: 600
          }}>
            <i className="fa-solid fa-lock" style={{ color: '#059669', marginRight: '0.3rem' }}></i> 256-Bit SSL Encrypted Enterprise Session
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
