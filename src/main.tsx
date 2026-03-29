import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from './app';
import Success from './success';
import Manager from './pages/Manager';
import Kitchen from './pages/Kitchen';
import KitchenLogin from './pages/KitchenLogin';
import TrackOrder from './pages/TrackOrder'; // ✅ STEP 9 ADD

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>

    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/success" element={<Success />} />
        <Route path="/manager" element={<Manager />} />

        {/* 🔐 Kitchen Auth Flow */}
        <Route path="/kitchen-login" element={<KitchenLogin />} />
        <Route path="/kitchen" element={<Kitchen />} />

        {/* 📦 STEP 9 TRACK ORDER */}
        <Route path="/track" element={<TrackOrder />} />

      </Routes>
    </BrowserRouter>

  </React.StrictMode>
);