import React, { useState } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const TrackOrder: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    if (!orderNumber.trim()) {
      alert("Enter order number");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/track/${orderNumber}`
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Order not found");
        setLoading(false);
        return;
      }

      setStatus(data.status);
      setPaymentStatus(data.payment_status);

    } catch (err) {
      console.error(err);
      alert("Tracking failed");
    }

    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>📦 Track Your Order</h1>

      <input
        type="text"
        placeholder="Enter Order Number (e.g. BP123...)"
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
        style={{ padding: 10, marginTop: 20, width: 250 }}
      />

      <br />

      <button
        onClick={handleTrack}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "blue",
          color: "white",
          borderRadius: 6
        }}
      >
        {loading ? "Checking..." : "Track"}
      </button>

      {status && (
        <div style={{ marginTop: 30 }}>
          <h2>Status: {status}</h2>
          <p>Payment: {paymentStatus}</p>
        </div>
      )}
    </div>
  );
};

export default TrackOrder;