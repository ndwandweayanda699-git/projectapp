import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from './app';
import Success from './success';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<App />} />
        <Route path="/success" element={<Success />} />

      </Routes>

    </BrowserRouter>

  </React.StrictMode>
);