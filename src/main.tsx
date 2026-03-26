import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from './app';
import Success from './success';
import Manager from './pages/Manager';
import Kitchen from './pages/Kitchen'; // ✅ ADD THIS

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>

    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/success" element={<Success />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="/kitchen" element={<Kitchen />} /> {/* ✅ ADD THIS */}
      </Routes>
    </BrowserRouter>

  </React.StrictMode>
);