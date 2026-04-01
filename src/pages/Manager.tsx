import React, { useEffect, useState, useCallback } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com"; // ✅ FIXED (ONLY CHANGE)

const Manager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ ADDED (popup state)
  const [message, setMessage] = useState("");

  // ✅ FIX: consistent token handling
  const getToken = () => localStorage.getItem("admin_token");

  const getHeaders = () => {
    const token = getToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  // ==============================
  // 🔐 LOGIN / LOGOUT
  // ==============================
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
        // ❌ alert → ✅ popup
        setMessage(data.error || "Wrong password");
      }
    } catch {
      setMessage("Server error");
    }
  };

  // ==============================
  // 📥 FETCH ORDERS
  // ==============================
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
        console.error("Orders fetch failed:", data);
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

  // ==============================
  // 🍔 FETCH MENU
  // ==============================
  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/menu`, {
        headers: getHeaders(),
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
  }, []);

  // ==============================
  // 🔄 TOGGLE MENU ITEM
  // ==============================
  const toggleItem = async (id: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/menu/${id}/toggle`, {
        method: "PUT",
        headers: getHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Toggle failed:", data);
        setMessage(data.error || "Toggle failed");
        return;
      }

      fetchMenu();
    } catch (err) {
      console.error("Toggle error:", err);
      setMessage("Toggle failed");
    }
  };

  // ==============================
  // ❌ DELETE ORDER
  // ==============================
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
    } catch (err) {
      console.error("Delete failed:", err);
      setMessage("Delete failed");
    }
  };

  // ==============================
  // 💰 REVENUE
  // ==============================
  const totalPaidRevenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + parseFloat(o.price || 0), 0);

  // ==============================
  // 🔄 AUTO LOAD
  // ==============================
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

  // ==============================
  // 🔒 LOGIN SCREEN
  // ==============================
  if (!loggedIn) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>

        {/* ✅ POPUP */}
        {message && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}>
            <div style={{
              background: "white",
              padding: 20,
              borderRadius: 10,
              textAlign: "center",
              width: 300
            }}>
              <img src="/logo.png" alt="logo" style={{ height: 50, marginBottom: 10 }} />
              <p>{message}</p>
              <button onClick={() => setMessage("")}>OK</button>
            </div>
          </div>
        )}

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
  const paidOrders = orders.filter((o) => o.payment_status === "paid");

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: "0 auto" }}>

      {/* ✅ POPUP */}
      {message && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "white",
            padding: 20,
            borderRadius: 10,
            textAlign: "center",
            width: 300
          }}>
            <img src="/logo.png" alt="logo" style={{ height: 50, marginBottom: 10 }} />
            <p>{message}</p>
            <button onClick={() => setMessage("")}>OK</button>
          </div>
        </div>
      )}

      <h1>📊 Manager Dashboard</h1>

      <button onClick={handleLogout}>Logout</button>

      <div style={{
        background: "green",
        color: "white",
        padding: 20,
        borderRadius: 10,
        marginTop: 20,
      }}>
        <h2>Revenue: R{totalPaidRevenue.toFixed(2)}</h2>
      </div>

      <h2 style={{ marginTop: 30 }}>🍔 Menu Control</h2>

      {menu.length === 0 ? (
        <p>No menu items found</p>
      ) : (
        menu.map((item) => (
          <div key={item.id} style={{
            background: "white",
            padding: 15,
            marginBottom: 10,
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
          }}>
            <div>
              <strong>{item.name}</strong> - R{item.price}
            </div>
            <button onClick={() => toggleItem(item.id)}>
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
            borderRadius: 8,
            borderLeft: `5px solid ${order.payment_status === "paid" ? "green" : "red"}`,
          }}>
            <h3>Order #{order.order_number}</h3>
            <p><strong>Item:</strong> {order.item_ordered}</p>
            <p><strong>Price:</strong> R{order.price}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <button
              onClick={() => deleteOrder(order.id)}
              style={{ background: "red", color: "white", marginTop: 10 }}
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




