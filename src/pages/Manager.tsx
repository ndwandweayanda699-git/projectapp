import React, { useEffect, useState, useCallback } from "react";

// ✅ Backend URL
const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Manager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      console.error("Error fetching orders", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 🔑 LOGIN
  const handleLogin = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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

  // 🔄 AUTO REFRESH
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

  // 🚚 UPDATE DELIVERY
  const updateDelivery = async (orderId: number, status: string) => {
    await fetch(`${BACKEND_URL}/api/update-delivery`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ order_id: orderId, status })
    });
    fetchOrders();
  };

  // ❌ DELETE
  const deleteOrder = async (orderId: number) => {
    if (!window.confirm("Delete permanently?")) return;

    setOrders(prev => prev.filter(order => order.id !== orderId));

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: getHeaders()
      });

      if (!res.ok) throw new Error();
    } catch {
      alert("Delete failed. Refreshing...");
      fetchOrders();
    }
  };

  // 💰 REVENUE
  const totalPaidRevenue = orders
    .filter(order => order.payment_status === "paid")
    .reduce((sum, order) => sum + parseFloat(order.price || 0), 0);

  // 🔒 LOGIN SCREEN
  if (!loggedIn) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <h1>Manager Login</h1>

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={{
            padding: 12,
            width: 250,
            borderRadius: 6,
            border: "1px solid #ccc"
          }}
        />

        <br />

        <button
          onClick={handleLogin}
          style={{
            marginTop: 20,
            padding: "10px 25px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 6
          }}
        >
          Login
        </button>
      </div>
    );
  }

  // 📊 DASHBOARD (PROFESSIONAL UI)
  return (
    <div style={{
      padding: "30px",
      maxWidth: "900px",
      margin: "0 auto",
      fontFamily: "Arial",
      background: "#f4f6f9",
      minHeight: "100vh"
    }}>

      {/* HEADER */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px"
      }}>
        <h1>📊 Manager Dashboard</h1>

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 15px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: 6
          }}
        >
          Logout
        </button>
      </div>

      {/* REVENUE CARD */}
      <div style={{
        background: "#28a745",
        color: "white",
        padding: "20px",
        borderRadius: 12,
        marginBottom: 30
      }}>
        <p>Total Paid Revenue</p>
        <h2>R{totalPaidRevenue.toFixed(2)}</h2>
      </div>

      {/* ORDERS */}
      {orders.length > 0 ? (
        orders.map(order => (
          <div key={order.id} style={{
            background: "white",
            padding: 20,
            borderRadius: 12,
            marginBottom: 15,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}>

            <div style={{
              display: "flex",
              justifyContent: "space-between"
            }}>
              <strong>Order #{order.id}</strong>

              <span style={{
                padding: "5px 10px",
                borderRadius: 20,
                background: order.payment_status === "paid" ? "#d4edda" : "#f8d7da",
                color: order.payment_status === "paid" ? "#155724" : "#721c24"
              }}>
                {order.payment_status}
              </span>
            </div>

            <p><b>Items:</b> {order.item_ordered}</p>
            <p><b>Price:</b> R{order.price}</p>
            <p><b>Status:</b> {order.delivery_status}</p>

            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => updateDelivery(order.id, "delivered")}
                style={{
                  marginRight: 10,
                  padding: "8px 12px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 6
                }}
              >
                Deliver
              </button>

              <button
                onClick={() => deleteOrder(order.id)}
                style={{
                  padding: "8px 12px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: 6
                }}
              >
                Delete
              </button>
            </div>

          </div>
        ))
      ) : (
        <p style={{ textAlign: "center" }}>No orders</p>
      )}
    </div>
  );
};

export default Manager;
