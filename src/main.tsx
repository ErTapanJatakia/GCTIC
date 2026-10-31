import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Application root element was not found in the document.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
