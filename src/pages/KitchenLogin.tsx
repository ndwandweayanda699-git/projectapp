import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const KitchenLogin: React.FC = () => {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/kitchen/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert("Wrong password");
        return;
      }

      localStorage.setItem("kitchen_token", data.token);

      navigate("/kitchen");
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div style={{ padding: 40, textAlign: "center" }}>

      {/* ✅ LOGO */}
      <img src="/logo.png" alt="Logo" style={{ height: 80, marginBottom: 20 }} />

      <h1>🍳 Kitchen Login</h1>

      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: 10, marginTop: 10 }}
      />

      <br />

      <button
        onClick={handleLogin}
        style={{ marginTop: 10, padding: 10 }}
      >
        Login
      </button>
    </div>
  );
};

export default KitchenLogin;