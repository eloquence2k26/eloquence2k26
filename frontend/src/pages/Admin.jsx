import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaSun, FaMoon } from 'react-icons/fa';
import AdminDashboard from './AdminDashboard.jsx';
import RegistrationCoordinatorDashboard from './RegistrationCoordinatorDashboard.jsx';
import EventCoordinatorDashboard from './EventCoordinatorDashboard.jsx';
import { getApiUrl } from '../config/api';

export default function Admin() {
  const isCoordinatorRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/coordinators');
  const [token, setToken] = useState(localStorage.getItem('adminToken') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('adminUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('adminTheme', nextTheme);
  };

  const isDark = theme === 'dark';

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);

    fetch(getApiUrl('/api/admin/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(`Welcome back, ${data.user?.username || 'User'}!`);
          localStorage.setItem('adminToken', data.token);
          if (data.user) {
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            setUser(data.user);
          }
          setToken(data.token);
        } else {
          toast.error(data.message || 'Login failed');
        }
      })
      .catch(err => {
        console.error('Login error:', err);
        toast.error('Server connection failed');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  // If we have a token, show dashboard according to user role
  if (token) {
    const loggedRole = String(user?.role || '').toLowerCase();
    const isSuperAdmin = loggedRole === 'admin' || loggedRole === 'superadmin';
    const isRegCoord = loggedRole.includes('registration') || loggedRole.includes('reg_coord') || loggedRole === 'registration coordinator';
    
    if (isRegCoord) {
      return <RegistrationCoordinatorDashboard token={token} user={user} onLogout={handleLogout} />;
    }

    const isEventCoord = loggedRole.includes('coordinator') || loggedRole.includes('lead') || loggedRole.includes('event_coord') || isCoordinatorRoute;
    if (isEventCoord && !isSuperAdmin) {
      return <EventCoordinatorDashboard token={token} user={user} onLogout={handleLogout} />;
    }

    return <AdminDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  const styles = getLoginStyles(isDark);

  // Otherwise, show login screen
  return (
    <div style={styles.container}>
      {/* Top right theme toggle */}
      <div style={styles.topBar}>
        <button 
          onClick={toggleTheme} 
          style={styles.themeToggleBtn}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? (
            <FaSun size={17} style={{ color: '#fbbf24' }} />
          ) : (
            <FaMoon size={16} style={{ color: '#6366f1' }} />
          )}
        </button>
      </div>

      <div style={styles.loginBox}>
        <h2 style={styles.title}>
          {isCoordinatorRoute ? 'Coordinator Access Login' : 'Admin & Coordinator Portal'}
        </h2>
        <p style={styles.subtitle}>
          {isCoordinatorRoute ? 'Enter coordinator credentials to access portal' : 'Enter credentials to access the dashboard'}
        </p>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder={isCoordinatorRoute ? "Enter coordinator username" : "Enter username"}
              required
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter password"
              required
            />
          </div>
          
          <button type="submit" disabled={isLoading} style={styles.button}>
            {isLoading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

const getLoginStyles = (isDark) => ({
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: isDark ? '#090d16' : '#f1f5f9',
    fontFamily: 'Inter, system-ui, sans-serif',
    position: 'relative',
    transition: 'background 0.25s ease'
  },
  topBar: {
    position: 'absolute',
    top: '1.5rem',
    right: '2rem'
  },
  themeToggleBtn: {
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
    background: isDark ? '#161f33' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    cursor: 'pointer',
    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.05)',
    transition: 'all 0.2s ease',
    padding: 0
  },
  loginBox: {
    background: isDark ? '#111827' : '#ffffff',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: isDark ? '0 20px 35px -5px rgba(0, 0, 0, 0.6)' : '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
    width: '90%',
    maxWidth: '420px',
    border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
    transition: 'background 0.25s ease, border-color 0.25s ease'
  },
  title: {
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    textAlign: 'center'
  },
  subtitle: {
    color: isDark ? '#94a3b8' : '#64748b',
    fontSize: '0.875rem',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    color: isDark ? '#cbd5e1' : '#334155',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  input: {
    background: isDark ? '#0c1220' : '#f8fafc',
    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
    padding: '0.75rem',
    borderRadius: '8px',
    color: isDark ? '#f8fafc' : '#0f172a',
    outline: 'none',
    fontSize: '1rem',
    transition: 'border-color 0.2s'
  },
  button: {
    background: '#3b82f6',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'background 0.2s'
  }
});
