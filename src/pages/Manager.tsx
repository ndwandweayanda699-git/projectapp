import React, { useEffect, useState, useCallback } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Manager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : ""
    };
  };

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
  // 📥 FETCH ORDERS
  // ==============================
  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setIsRefreshing(true);

      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok) {
        setOrders(Array.isArray(data) ? data : []);
      } else {
        console.error("Orders fetch failed:", data);
        setOrders([]);
      }

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

      const data = await res.json();

      if (res.ok) {
        setMenu(Array.isArray(data) ? data : []);
      } else {
        console.error("Menu fetch failed:", data);

        if (data?.error === "Invalid token" || data?.error === "No token") {
          handleLogout();
        }

        setMenu([]);
      }

    } catch (err) {
      console.error("Menu fetch error", err);
      setMenu([]);
    }
  };

  // ==============================
  // 🔄 TOGGLE MENU ITEM
  // ==============================
  const toggleItem = async (id: number) => {
    try {
      await fetch(`${BACKEND_URL}/api/admin/menu/${id}/toggle`, {
        method: "PUT",
        headers: getHeaders()
      });

      fetchMenu();
    } catch {
      alert("Toggle failed");
    }
  };

  // ==============================
  // ❌ DELETE ORDER
  // ==============================
  const deleteOrder = async (orderId: number) => {
    const confirmDelete = window.confirm("Delete this order?");
    if (!confirmDelete) return;

    try {
      await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: getHeaders()
      });

      fetchOrders();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed");
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

    let interval: any;

    if (token) {
      interval = setInterval(() => {
        fetchOrders();
        fetchMenu();
      }, 5000);
    }

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
  const paidOrders = orders.filter(o => o.payment_status === "paid");

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

      {menu.length === 0 ? (
        <p>No menu items found</p>
      ) : (
        menu.map(item => (
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
        ))
      )}

      {/* 📦 PAID ORDERS ONLY */}
      <h2 style={{ marginTop: 30 }}>Paid Orders</h2>

      {paidOrders.length === 0 ? (
        <p>No paid orders</p>
      ) : (
        paidOrders.map(order => (
          <div key={order.id} style={{
            background: "white",
            padding: 15,
            marginBottom: 10,
            borderRadius: 8
          }}>
            <strong>Order #{order.id}</strong>
            <p>{order.item_ordered}</p>
            <p>R{order.price}</p>

            {/* ❌ DELETE */}
            <button
              onClick={() => deleteOrder(order.id)}
              style={{
                background: "red",
                color: "white",
                padding: "6px 12px",
                borderRadius: 6
              }}
            >
              Delete
            </button>
          </div>
        ))
      )}

    </div>
  );
};

export default Manager;