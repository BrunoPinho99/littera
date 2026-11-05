import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { TillmornMarketingPage } from './src/app/(marketing)/page';
import './index.css';

const App = lazy(() => import('./App'));

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TillmornMarketingPage />} />
        <Route path="/tillmorn" element={<TillmornMarketingPage />} />
        <Route path="/marketing" element={<TillmornMarketingPage />} />
        <Route
          path="/*"
          element={
            <Suspense fallback={null}>
              <App />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);