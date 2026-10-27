import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VentaProvider } from './context/VentaContext';
import App from './App';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/lexend/500.css';
import '@fontsource/lexend/600.css';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <VentaProvider>
          <App />
        </VentaProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
