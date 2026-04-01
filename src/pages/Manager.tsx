import React, { useEffect, useState, useCallback } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Manager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [message, setMessage] = useState("");

  const getToken = () => localStorage.getItem("admin_token");

  const getHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLoggedIn(false);
    setOrders([]);
    setMenu([]);
  };

  const handleLogin = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("admin_token", data.token);
        setLoggedIn(true);
        fetchOrders();
        fetchMenu();
      } else {
        setMessage(data.error || "Wrong password");
      }
    } catch {
      setMessage("Server error");
    }
  };

  const fetchOrders = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      setIsRefreshing(true);

      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setOrders(Array.isArray(data) ? data : []);
      } else {
        if (data?.error === "Invalid token" || data?.error === "No token") {
          handleLogout();
        }
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/menu`, {
        headers: getHeaders(),
      });

      const data = await res.json();

      if (res.ok) {
        setMenu(Array.isArray(data) ? data : []);
      } else {
        if (data?.error === "Invalid token" || data?.error === "No token") {
          handleLogout();
        }
        setMenu([]);
      }
    } catch (err) {
      setMenu([]);
    }
  }, []);

  const toggleItem = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/menu/${id}/toggle`, {
        method: "PUT",
        headers: getHeaders(),
      });

      if (!res.ok) {
        setMessage("Toggle failed");
        return;
      }

      fetchMenu();
    } catch {
      setMessage("Toggle failed");
    }
  };

  const deleteOrder = async (orderId: number) => {
    const confirmDelete = window.confirm("Delete this order?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) {
        setMessage("Delete failed");
        return;
      }

      fetchOrders();
    } catch {
      setMessage("Delete failed");
    }
  };

  const totalPaidRevenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + parseFloat(o.price || 0), 0);

  useEffect(() => {
    const token = getToken();

    if (token) {
      setLoggedIn(true);
      fetchOrders();
      fetchMenu();
    }

    const interval = setInterval(() => {
      fetchOrders();
      fetchMenu();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchOrders, fetchMenu]);

  if (!loggedIn) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f5f5f5"
      }}>
        <div style={{
          background: "white",
          padding: 30,
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          textAlign: "center",
          width: 320
        }}>

          {message && (
            <p style={{ color: "red", marginBottom: 10 }}>{message}</p>
          )}

          <h2>Manager Login</h2>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              padding: 12,
              width: "100%",
              borderRadius: 6,
              border: "1px solid #ccc"
            }}
          />

          <button
            onClick={handleLogin}
            style={{
              marginTop: 15,
              width: "100%",
              padding: 10,
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const paidOrders = orders.filter((o) => o.payment_status === "paid");

  return (
    <div style={{
      padding: 30,
      maxWidth: 900,
      margin: "0 auto",
      background: "#f9f9f9",
      minHeight: "100vh"
    }}>

      <h1 style={{ marginBottom: 10 }}>📊 Manager Dashboard</h1>

      <button
        onClick={handleLogout}
        style={{
          background: "#dc3545",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: 6,
          cursor: "pointer"
        }}
      >
        Logout
      </button>

      <div style={{
        background: "linear-gradient(135deg, #28a745, #218838)",
        color: "white",
        padding: 20,
        borderRadius: 12,
        marginTop: 20,
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
      }}>
        <h2>Revenue: R{totalPaidRevenue.toFixed(2)}</h2>
      </div>

      {isRefreshing && <p style={{ color: "#888" }}>Refreshing...</p>}

      <h2 style={{ marginTop: 30 }}>🍔 Menu Control</h2>

      {menu.length === 0 ? (
        <p>No menu items found</p>
      ) : (
        menu.map((item) => (
          <div key={item.id} style={{
            background: "white",
            padding: 15,
            marginBottom: 10,
            borderRadius: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}>
            <div>
              <strong>{item.name}</strong>
              <div style={{ color: "#777" }}>R{item.price}</div>
            </div>

            <button
              onClick={() => toggleItem(item.id)}
              style={{
                background: item.is_available ? "#ff4d4f" : "#28a745",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer"
              }}
            >
              {item.is_available ? "Disable" : "Enable"}
            </button>
          </div>
        ))
      )}

      <h2 style={{ marginTop: 30 }}>📦 Recent Orders</h2>

      {orders.length === 0 ? (
        <p>No orders yet</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={{
            background: "white",
            padding: 15,
            marginBottom: 10,
            borderRadius: 10,
            borderLeft: `5px solid ${order.payment_status === "paid" ? "#28a745" : "#dc3545"}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}>
            <h3>Order #{order.order_number}</h3>
            <p><strong>{order.item_ordered}</strong></p>
            <p>R{order.price}</p>
            <p>Status: {order.status}</p>

            <button
              onClick={() => deleteOrder(order.id)}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer"
              }}
            >
              Delete Order
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default Manager;




