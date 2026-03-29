import React, { useState } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const TrackOrder: React.FC = () => {
  // ✅ Auto-fill from localStorage
  const [orderNumber, setOrderNumber] = useState(
    localStorage.getItem("orderNumber") || ""
  );

  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async () => {
    if (!orderNumber.trim()) {
      setError("Enter order number");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");
    setPaymentStatus("");

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/track/${orderNumber}`
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Order not found");
        setLoading(false);
        return;
      }

      setStatus(data.status);
      setPaymentStatus(data.payment_status);

    } catch (err) {
      console.error(err);
      setError("Tracking failed");
    }

    setLoading(false);
  };

  // ✅ Status color logic
  const getStatusColor = () => {
    if (status === "preparing") return "orange";
    if (status === "ready") return "green";
    if (status === "pending") return "gray";
    return "black";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc"
      }}
    >
      <h1>📦 Track Your Order</h1>

      {/* INPUT */}
      <input
        type="text"
        placeholder="Enter Order Number (e.g. BP123...)"
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
        style={{
          padding: 12,
          marginTop: 20,
          width: 260,
          borderRadius: 6,
          border: "1px solid #ccc"
        }}
      />

      {/* BUTTON */}
      <button
        onClick={handleTrack}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "#2563eb",
          color: "white",
          borderRadius: 6,
          border: "none"
        }}
      >
        {loading ? "Checking..." : "Track Order"}
      </button>

      {/* ERROR MESSAGE */}
      {error && (
        <div style={{ marginTop: 20, color: "red" }}>
          {error}
        </div>
      )}

      {/* RESULT */}
      {status && (
        <div
          style={{
            marginTop: 30,
            background: "white",
            padding: 20,
            borderRadius: 10,
            boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
            textAlign: "center",
            width: 300
          }}
        >
          <h2>Order #{orderNumber}</h2>

          <p>
            Payment: <strong>{paymentStatus}</strong>
          </p>

          <p>
            Status:{" "}
            <strong style={{ color: getStatusColor() }}>
              {status}
            </strong>
          </p>

          {/* BACK BUTTON */}
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              background: "black",
              color: "white",
              borderRadius: 6,
              border: "none"
            }}
          >
            Back to Menu
          </button>
        </div>
      )}
    </div>
  );
};

export default TrackOrder;