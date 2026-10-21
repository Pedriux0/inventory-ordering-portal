// light / dark mode
// index.html already set data-theme on <html> before react started (so there is no flash),
// this file just reads it and lets the toggle button change and remember it

const THEME_KEY = 'portal_theme';

export function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  // localStorage can be blocked (private mode etc), the toggle still works for this visit
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}
