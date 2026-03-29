import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const TrackOrder: React.FC = () => {

  const [orders, setOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==============================
  // LOAD ORDERS
  // ==============================
  useEffect(() => {
    const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");

    setOrders(savedOrders);

    if (savedOrders.length > 0) {
      setSelectedOrder(savedOrders[0]); // latest auto selected
    }
  }, []);

  // ==============================
  // TRACK SELECTED ORDER
  // ==============================
  const handleTrack = async (orderNumber: string) => {
    if (!orderNumber) return;

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

  // ==============================
  // AUTO TRACK WHEN SELECTED
  // ==============================
  useEffect(() => {
    if (selectedOrder) {
      handleTrack(selectedOrder);
    }
  }, [selectedOrder]);

  const getStatusColor = () => {
    if (status === "preparing") return "orange";
    if (status === "ready") return "green";
    if (status === "pending") return "gray";
    return "black";
  };

  return (
    <div style={{ padding: 20 }}>

      <h1>📦 Your Orders</h1>

      {/* ORDER LIST */}
      {orders.length === 0 && <p>No orders found</p>}

      {orders.map((order) => (
        <div
          key={order}
          onClick={() => setSelectedOrder(order)}
          style={{
            padding: 10,
            margin: "10px 0",
            border: "1px solid #ccc",
            cursor: "pointer",
            background: selectedOrder === order ? "#e0f2fe" : "white"
          }}
        >
          {order}
        </div>
      ))}

      {/* RESULT */}
      {selectedOrder && (
        <div style={{ marginTop: 20 }}>
          <h2>Order: {selectedOrder}</h2>

          {loading && <p>Checking...</p>}

          {error && <p style={{ color: "red" }}>{error}</p>}

          {status && (
            <>
              <p>Payment: <strong>{paymentStatus}</strong></p>
              <p>
                Status:{" "}
                <strong style={{ color: getStatusColor() }}>
                  {status}
                </strong>
              </p>
            </>
          )}
        </div>
      )}

      {/* CLEAR ALL */}
      <button
        onClick={() => {
          localStorage.removeItem("orders");
          setOrders([]);
          setSelectedOrder("");
          setStatus("");
          setPaymentStatus("");
        }}
        style={{
          marginTop: 20,
          padding: "8px 16px",
          background: "red",
          color: "white"
        }}
      >
        Clear All Orders
      </button>
    </div>
  );
};

export default TrackOrder;