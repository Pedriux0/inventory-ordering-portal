import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Message } from '../components/ui'
import { useSaving } from '../hooks'

// profile page (mockup 4), every role
// view your account (2.3.1), update name and email (2.3.2, FE-09), change password (2.3.3, FE-14)
export default function Profile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [details, setDetails] = useState({ fullName: '', email: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [detailsMsg, setDetailsMsg] = useState({ error: '', success: '' });
  const [passwordMsg, setPasswordMsg] = useState({ error: '', success: '' });
  const [saving, guard] = useSaving();

  useEffect(() => {
    api
      .get('/users/profile')
      .then((p) => {
        setProfile(p);
        setDetails({ fullName: p.fullName, email: p.email });
      })
      .catch((err) => setDetailsMsg({ error: err.message, success: '' }));
  }, []);

  async function saveDetails(event) {
    event.preventDefault();
    setDetailsMsg({ error: '', success: '' });
    await guard(async () => {
      try {
        const updated = await api.put('/users/profile', details);
        setProfile(updated);
        updateUser({ fullName: updated.fullName, email: updated.email }); // the top bar shows the new name
        setDetailsMsg({ error: '', success: 'Your details were updated.' });
      } catch (err) {
        setDetailsMsg({ error: err.message, success: '' });
      }
    });
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordMsg({ error: '', success: '' });
    // checked here only to save a round trip; the api checks the password rules for real
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMsg({ error: 'The new passwords do not match.', success: '' });
      return;
    }
    await guard(async () => {
      try {
        await api.put('/users/profile/password', {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        });
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordMsg({ error: '', success: 'Password changed. Use the new password next time you sign in.' });
      } catch (err) {
        setPasswordMsg({ error: err.message, success: '' }); // e.g. "Current password is incorrect"
      }
    });
  }

  if (!profile) {
    return detailsMsg.error ? <Message>{detailsMsg.error}</Message> : <p className="muted" role="status">Loading profile...</p>;
  }

  return (
    <>
      <h1>Profile</h1>

      <section className="card" aria-labelledby="account-title">
        <h2 id="account-title">Account</h2>
        <dl className="details">
          <dt>User ID</dt><dd>{profile.userId}</dd>
          <dt>Name</dt><dd data-cy="profile-name">{profile.fullName}</dd>
          <dt>Email</dt><dd>{profile.email}</dd>
          <dt>Role</dt><dd>{profile.role}</dd>
          <dt>Status</dt><dd>{profile.isActive ? 'Active' : 'Inactive'}</dd>
        </dl>
      </section>

      <form className="card form" onSubmit={saveDetails} aria-label="Edit your details">
        <h2>Edit your details</h2>
        <Message>{detailsMsg.error}</Message>
        <Message type="success">{detailsMsg.success}</Message>
        <div className="form-row">
          <div>
            <label htmlFor="profileName">Full name</label>
            <input id="profileName" value={details.fullName} onChange={(e) => setDetails({ ...details, fullName: e.target.value })} maxLength={128} required />
          </div>
          <div>
            <label htmlFor="profileEmail">Email</label>
            <input id="profileEmail" type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} required />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>Save details</button>
        </div>
      </form>

      <form className="card form" onSubmit={changePassword} aria-label="Change password">
        <h2>Change password</h2>
        <Message>{passwordMsg.error}</Message>
        <Message type="success">{passwordMsg.success}</Message>
        <label htmlFor="currentPassword">Current password</label>
        <input id="currentPassword" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
        <div className="form-row">
          <div>
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required />
            <p className="hint">At least 16 characters, with upper case, lower case and a number.</p>
          </div>
          <div>
            <label htmlFor="confirmPassword">Repeat new password</label>
            <input id="confirmPassword" type="password" autoComplete="new-password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>Change password</button>
        </div>
      </form>
    </>
  );
}
