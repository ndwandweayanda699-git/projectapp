import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Success: React.FC = () => {
  const navigate = useNavigate();

  // ✅ Get order_id from URL
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");

  // ✅ Get orderNumber from localStorage
  const orderNumber = localStorage.getItem("orderNumber");

  // ✅ NEW: order status state
  const [status, setStatus] = useState("loading");

  // ==============================
  // 🔄 FETCH ORDER STATUS (STEP 8)
  // ==============================
  const fetchStatus = async () => {
    if (!orderId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`);
      const data = await res.json();

      if (data?.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error("Status fetch error:", err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // 🔁 auto refresh every 3s
    const interval = setInterval(fetchStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // ⏳ Auto redirect after 5 seconds (slightly longer so user sees status)
    const timer = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>✅ Payment Successful</h1>

      {/* ✅ ORDER NUMBER */}
      {orderNumber && (
        <div style={{ marginTop: 20 }}>
          <h2>Your Order Number:</h2>
          <h1 style={{ color: "green" }}>{orderNumber}</h1>
        </div>
      )}

      {/* ✅ FALLBACK */}
      {!orderNumber && orderId && (
        <p>
          Your order <strong>#{orderId}</strong> has been received.
        </p>
      )}

      {/* ✅ STEP 8: LIVE STATUS */}
      <h2 style={{ marginTop: 20 }}>
        Status: {status.toUpperCase()}
      </h2>

      {/* ✅ SMART STATUS MESSAGES */}
      {status === "pending" && <p>Waiting for payment confirmation...</p>}
      {status === "preparing" && <p>🍳 Kitchen is preparing your food...</p>}
      {status === "ready" && <p>✅ Your order is ready!</p>}
      {status === "completed" && <p>🎉 Order completed!</p>}

      <p style={{ marginTop: 10 }}>Redirecting to menu...</p>

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "green",
          color: "white",
          borderRadius: 6
        }}
      >
        Back to Menu
      </button>
    </div>
  );
};

export default Success;