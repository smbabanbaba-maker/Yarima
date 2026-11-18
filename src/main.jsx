import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';
// Keep checkout returns, bookmarks and sign-in on the canonical hostname.
// Cookies are host-scoped: users may need to sign in once on the new domain.
if (window.location.hostname === 'yarima-zeta.vercel.app') {
  window.location.replace('https://www.alyarimasub.com.ng' + window.location.pathname + window.location.search + window.location.hash);
} else {
  createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
}