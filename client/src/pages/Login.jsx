import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import { useAuth } from '../auth'
import { Message, ThemeToggle } from '../components/ui'

// login page (mockup 1, FE-01 / FE-02)
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/'); // FE-01: valid login goes to the dashboard
    } catch (err) {
      setError(err.message); // FE-02: "Invalid email or password"
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <ThemeToggle className="login-theme" />

      {/* left: what this tool is for (hidden on phones, the form matters more there) */}
      <aside className="login-brand" aria-hidden="true">
        <div className="brand">
          <span className="brand-logo">IP</span> Inventory Portal
        </div>
        <div className="login-pitch">
          <h2>Stock, orders and suppliers in one place.</h2>
          <ul>
            <li><PackageCheck size={20} /> See what needs reordering at a glance</li>
            <li><Truck size={20} /> Record deliveries from your suppliers</li>
            <li><ShieldCheck size={20} /> Every action checked against your role</li>
          </ul>
        </div>
      </aside>

      {/* right: the form */}
      <main className="login-main">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="brand brand-dark login-mobile-brand">
            <span className="brand-logo">IP</span> Inventory Portal
          </div>
          <h1>Sign in</h1>
          <p className="muted">Use the account your administrator created for you.</p>

          <Message>{error}</Message>

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* passwords are 16+ characters (req 2.1.2), so being able to check what you typed helps */}
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  );
}
