import React, { useEffect, useState, useCallback } from "react";

// ⚠️ Updated to match the active URL from your screenshot
const BACKEND_URL = "";

const Manager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper for Headers
  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  });

  // 🚪 LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    setOrders([]);
  };

  // 📥 FETCH ORDERS
  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setIsRefreshing(true);
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Network error fetching orders");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 🔑 LOGIN
  const handleLogin = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        setLoggedIn(true);
        fetchOrders();
      } else {
        alert(data.error || "Wrong password");
      }
    } catch (err) {
      alert("Could not connect to server.");
    }
  };

  // 🔄 POLLING EFFECT
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedIn(true);
      fetchOrders();
    }

    let interval: any;
    if (loggedIn || token) {
      interval = setInterval(fetchOrders, 5000);
    }

    return () => clearInterval(interval);
  }, [loggedIn, fetchOrders]);

  // 🚚 ACTIONS
  const updateDelivery = async (orderId: number, status: string) => {
    await fetch(`${BACKEND_URL}/api/update-delivery`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ order_id: orderId, status })
    });
    fetchOrders();
  };

  // 🗃️ ARCHIVE (Optimistic Update)
  const archiveOrder = async (orderId: number) => {
    // Remove from UI immediately
    setOrders(prev => prev.filter(order => order.id !== orderId));

    try {
      const res = await fetch(`${BACKEND_URL}/api/archive-order`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ order_id: orderId })
      });
      if (!res.ok) throw new Error("Archive failed");
    } catch (err) {
      console.error(err);
      alert("Archive failed on server. Refreshing...");
      fetchOrders();
    }
  };

  // ❌ DELETE (Optimistic Update)
  const deleteOrder = async (orderId: number) => {
    if (!window.confirm("Delete permanently?")) return;

    // Remove from UI immediately
    setOrders(prev => prev.filter(order => order.id !== orderId));

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error(err);
      alert("Delete failed on server. Refreshing...");
      fetchOrders();
    }
  };

  // 💰 CALCULATE REVENUE (Paid only)
  const totalPaidRevenue = orders
    .filter(order => order.payment_status === "paid")
    .reduce((sum, order) => sum + parseFloat(order.price || 0), 0);

  // 🔒 LOGIN SCREEN
  if (!loggedIn) {
    return (
      <div style={{ textAlign: "center", marginTop: 100, fontFamily: 'sans-serif' }}>
        <h1>Manager Login</h1>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{ padding: 12, width: 250, borderRadius: 5, border: "1px solid #ccc" }}
        />
        <br />
        <button
          onClick={handleLogin}
          style={{ marginTop: 20, padding: "10px 30px", background: "#007bff", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}
        >
          Login
        </button>
      </div>
    );
  }

  // 📊 DASHBOARD
  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", fontFamily: 'sans-serif' }}>

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Manager Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{ padding: "8px 15px", background: "#6c757d", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      {/* 💰 REVENUE CARD */}
      <div style={{
        background: "#d4edda",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "30px",
        textAlign: "center",
        border: "1px solid #c3e6cb",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
      }}>
        <p style={{ margin: 0, color: "#155724", fontWeight: "bold", textTransform: "uppercase", fontSize: "0.9rem" }}>Total Paid Revenue</p>
        <h2 style={{ margin: "10px 0 0 0", color: "#155724", fontSize: "2.5rem" }}>
          R{totalPaidRevenue.toFixed(2)}
        </h2>
        {isRefreshing && <p style={{ fontSize: "0.7rem", margin: "5px 0 0 0", color: "#155724" }}>Updating live...</p>}
      </div>

      <hr style={{ border: "0", borderTop: "1px solid #eee", marginBottom: 20 }} />

      {/* ORDERS LIST */}
      {Array.isArray(orders) && orders.length > 0 ? (
        orders.map(order => (
          <div key={order.id} style={{
            border: "1px solid #eee",
            borderRadius: 10,
            margin: "15px 0",
            padding: 20,
            backgroundColor: 'white',
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p><b>Order:</b> #{order.id}</p>
              <span style={{
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: "0.8rem",
                fontWeight: "bold",
                background: order.payment_status === "paid" ? "#d4edda" : "#f8d7da",
                color: order.payment_status === "paid" ? "#155724" : "#721c24"
              }}>
                {order.payment_status.toUpperCase()}
              </span>
            </div>

            <p style={{ margin: "10px 0" }}><b>Items:</b> {order.item_ordered}</p>
            <p style={{ margin: "5px 0" }}><b>Price:</b> R{order.price}</p>
            <p style={{ margin: "5px 0" }}><b>Status:</b> <span style={{ color: '#007bff', fontWeight: "bold" }}>{order.delivery_status}</span></p>
            <p style={{ margin: "5px 0" }}><b>Address:</b> {order.address}</p>

            <div style={{ marginTop: 20, paddingTop: 15, borderTop: "1px solid #f5f5f5" }}>
              {order.payment_status === "paid" && order.delivery_status === "pending" && (
                <button
                  onClick={() => updateDelivery(order.id, "out_for_delivery")}
                  style={{ marginRight: 10, padding: "8px 15px", background: '#28a745', color: 'white', border: 'none', borderRadius: 5, cursor: "pointer" }}
                >
                  🚀 Start Delivery
                </button>
              )}

              {order.delivery_status === "out_for_delivery" && (
                <button
                  onClick={() => updateDelivery(order.id, "delivered")}
                  style={{ marginRight: 10, padding: "8px 15px", background: '#007bff', color: 'white', border: 'none', borderRadius: 5, cursor: "pointer" }}
                >
                  ✅ Mark Delivered
                </button>
              )}

              <button
                onClick={() => archiveOrder(order.id)}
                style={{ marginRight: 10, padding: "8px 15px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: 5, cursor: "pointer" }}
              >
                🗃️ Archive
              </button>

              <button
                onClick={() => deleteOrder(order.id)}
                style={{ padding: "8px 15px", background: "#dc3545", color: "white", border: "none", borderRadius: 5, cursor: "pointer" }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))
      ) : (
        <div style={{ textAlign: "center", padding: 50, color: "#888" }}>
          <p>No active orders found.</p>
        </div>
      )}
    </div>
  );
};

export default Manager;
