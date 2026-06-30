/**
 * File Purpose: Frontend Entry Point
 * 
 * Bootstraps the React application into the DOM and configures global
 * providers such as StrictMode and i18n.
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
