import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      <form className="card login-card" onSubmit={handleSubmit}>
        <div className="brand brand-dark">
          <span className="brand-logo">IP</span> Inventory Portal
        </div>
        <h1>Sign in</h1>

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
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
