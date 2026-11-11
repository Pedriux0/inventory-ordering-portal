import { useEffect, useRef, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth'
import { useToast } from '../components/Toast'
import { Field, Message, PageHeader, focusFirstError } from '../components/ui'
import { useSaving } from '../hooks'
import { changePasswordErrors, hasErrors, profileErrors } from '../validation'

const NO_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

// profile page (mockup 4), every role
// view your account (2.3.1), update name and email (2.3.2, FE-09), change password (2.3.3, FE-14)
export default function Profile() {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [details, setDetails] = useState({ fullName: '', email: '' });
  const [detailErrors, setDetailErrors] = useState({});
  const [detailsServerError, setDetailsServerError] = useState('');
  const [passwords, setPasswords] = useState(NO_PASSWORDS);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordServerError, setPasswordServerError] = useState('');
  const [saving, guard] = useSaving();
  const detailsRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    api
      .get('/users/profile')
      .then((p) => {
        setProfile(p);
        setDetails({ fullName: p.fullName, email: p.email });
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  async function saveDetails(event) {
    event.preventDefault();
    const found = profileErrors(details);
    setDetailErrors(found);
    setDetailsServerError('');
    if (hasErrors(found)) {
      setTimeout(() => focusFirstError(detailsRef.current));
      return;
    }
    await guard(async () => {
      try {
        const updated = await api.put('/users/profile', details);
        setProfile(updated);
        updateUser({ fullName: updated.fullName, email: updated.email }); // the top bar shows the new name
        toast('Your details were updated.');
      } catch (err) {
        setDetailsServerError(err.message); // e.g. email already in use
      }
    });
  }

  async function changePassword(event) {
    event.preventDefault();
    // checked here only to answer straight away; the api checks the password rules for real
    const found = changePasswordErrors(passwords);
    setPasswordErrors(found);
    setPasswordServerError('');
    if (hasErrors(found)) {
      setTimeout(() => focusFirstError(passwordRef.current));
      return;
    }
    await guard(async () => {
      try {
        await api.put('/users/profile/password', {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        });
        setPasswords(NO_PASSWORDS);
        toast('Password changed. Use the new password next time you sign in.');
      } catch (err) {
        setPasswordServerError(err.message); // e.g. "Current password is incorrect"
      }
    });
  }

  function editDetails(name, value) {
    const next = { ...details, [name]: value };
    setDetails(next);
    if (detailErrors[name]) setDetailErrors(profileErrors(next));
  }

  function editPasswords(name, value) {
    const next = { ...passwords, [name]: value };
    setPasswords(next);
    if (passwordErrors[name]) setPasswordErrors(changePasswordErrors(next));
  }

  if (!profile) {
    return (
      <>
        <PageHeader title="Profile" />
        {loadError ? <Message>{loadError}</Message> : <p className="muted" role="status">Loading profile...</p>}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Profile" description="Your account, your details and your password." />

      <div className="profile-grid">
        <section className="card" aria-labelledby="account-title">
          <div className="profile-head">
            <span className="avatar avatar-large" aria-hidden="true">
              {profile.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <h2 id="account-title" data-cy="profile-name">{profile.fullName}</h2>
              <p className="muted small">{profile.email}</p>
            </div>
          </div>
          <dl className="details">
            <dt>User ID</dt><dd>#{profile.userId}</dd>
            <dt>Role</dt><dd>{profile.role}</dd>
            <dt>Status</dt>
            <dd>
              <span className={`badge ${profile.isActive ? 'badge-success' : 'badge-muted'}`}>{profile.isActive ? 'Active' : 'Inactive'}</span>
            </dd>
          </dl>
        </section>

        <div className="profile-forms">
          <form ref={detailsRef} className="card" onSubmit={saveDetails} noValidate aria-label="Edit your details">
            <h2>Edit your details</h2>
            <Message>{detailsServerError}</Message>
            <div className="form-row">
              <Field id="profileName" label="Full name" required error={detailErrors.fullName}>
                {(props) => <input {...props} value={details.fullName} onChange={(e) => editDetails('fullName', e.target.value)} maxLength={128} autoComplete="name" />}
              </Field>
              <Field id="profileEmail" label="Email" required error={detailErrors.email}>
                {(props) => <input {...props} type="email" value={details.email} onChange={(e) => editDetails('email', e.target.value)} autoComplete="email" />}
              </Field>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>Save details</button>
            </div>
          </form>

          <form ref={passwordRef} className="card" onSubmit={changePassword} noValidate aria-label="Change password">
            <h2><KeyRound size={18} aria-hidden="true" /> Change password</h2>
            <Message>{passwordServerError}</Message>
            <Field id="currentPassword" label="Current password" required error={passwordErrors.currentPassword}>
              {(props) => <input {...props} type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => editPasswords('currentPassword', e.target.value)} />}
            </Field>
            <div className="form-row">
              <Field id="newPassword" label="New password" required error={passwordErrors.newPassword} hint="At least 16 characters, with upper case, lower case and a number.">
                {(props) => <input {...props} type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(e) => editPasswords('newPassword', e.target.value)} />}
              </Field>
              <Field id="confirmPassword" label="Repeat new password" required error={passwordErrors.confirmPassword}>
                {(props) => <input {...props} type="password" autoComplete="new-password" value={passwords.confirmPassword} onChange={(e) => editPasswords('confirmPassword', e.target.value)} />}
              </Field>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>Change password</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
