import React, { useEffect, useState, useCallback } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Manager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`
  });

  // ==============================
  // 🔐 LOGIN / LOGOUT
  // ==============================
  const handleLogout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    setOrders([]);
    setMenu([]);
  };

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
        fetchMenu();
      } else {
        alert(data.error || "Wrong password");
      }
    } catch {
      alert("Server error");
    }
  };

  // ==============================
  // 📥 FETCH ORDERS (FIXED 🔥)
  // ==============================
  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setIsRefreshing(true);

      const res = await fetch(`${BACKEND_URL}/api/kitchen/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        console.error("Orders fetch failed:", res.status);
        return;
      }

      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ==============================
  // 🍔 FETCH MENU
  // ==============================
  const fetchMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/menu`, {
        headers: getHeaders()
      });

      if (!res.ok) {
        console.error("Menu fetch failed:", res.status);
        return;
      }

      const data = await res.json();
      setMenu(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Menu fetch error", err);
    }
  };

  // ==============================
  // 🔄 TOGGLE MENU ITEM
  // ==============================
  const toggleItem = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/menu/${id}/toggle`, {
        method: "PUT",
        headers: getHeaders()
      });

      if (!res.ok) {
        alert("Toggle failed");
        return;
      }

      fetchMenu();
    } catch {
      alert("Toggle failed");
    }
  };

  // ==============================
  // 💰 REVENUE
  // ==============================
  const totalPaidRevenue = orders
    .filter(o => o.payment_status === "paid")
    .reduce((sum, o) => sum + parseFloat(o.price || 0), 0);

  // ==============================
  // 🔄 AUTO LOAD
  // ==============================
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      setLoggedIn(true);
      fetchOrders();
      fetchMenu();
    }

    const interval = setInterval(() => {
      if (localStorage.getItem("token")) {
        fetchOrders();
        fetchMenu();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ==============================
  // 🔒 LOGIN SCREEN
  // ==============================
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
          style={{ padding: 12, width: 250 }}
        />

        <br />

        <button onClick={handleLogin} style={{ marginTop: 20 }}>
          Login
        </button>
      </div>
    );
  }

  // ==============================
  // 📊 DASHBOARD
  // ==============================
  return (
    <div style={{ padding: 30, maxWidth: 900, margin: "0 auto" }}>

      <h1>📊 Manager Dashboard</h1>

      <button onClick={handleLogout}>Logout</button>

      {/* 💰 REVENUE */}
      <div style={{
        background: "green",
        color: "white",
        padding: 20,
        borderRadius: 10,
        marginTop: 20
      }}>
        <h2>Revenue: R{totalPaidRevenue.toFixed(2)}</h2>
      </div>

      {/* 🍔 MENU CONTROL */}
      <h2 style={{ marginTop: 30 }}>🍔 Menu Control</h2>

      {menu.length === 0 && <p>No menu items found</p>}

      {menu.map(item => (
        <div key={item.id} style={{
          background: "white",
          padding: 15,
          marginBottom: 10,
          borderRadius: 8,
          display: "flex",
          justifyContent: "space-between"
        }}>
          <div>
            <strong>{item.name}</strong> - R{item.price}
          </div>

          <button
            onClick={() => toggleItem(item.id)}
            style={{
              background: item.is_available ? "green" : "red",
              color: "white",
              padding: "6px 12px",
              borderRadius: 6
            }}
          >
            {item.is_available ? "Available" : "Out of Stock"}
          </button>
        </div>
      ))}

      {/* 📦 ORDERS */}
      <h2 style={{ marginTop: 30 }}>Orders</h2>

      {orders.length === 0 && <p>No orders yet</p>}

      {orders.map(order => (
        <div key={order.id} style={{
          background: "white",
          padding: 15,
          marginBottom: 10,
          borderRadius: 8
        }}>
          <strong>Order #{order.id}</strong>
          <p>{order.item_ordered}</p>
          <p>R{order.price}</p>
          <p>Status: {order.payment_status}</p>
        </div>
      ))}

    </div>
  );
};

export default Manager;