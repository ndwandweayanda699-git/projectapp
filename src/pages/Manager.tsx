import React, { useEffect, useState, useCallback } from "react";

// ✅ Correct backend URL
const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

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

      console.log("FETCH ORDERS STATUS:", res.status);

      const data = await res.json();
      console.log("ORDERS DATA:", data);

      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Network error fetching orders", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 🔑 LOGIN (UPDATED WITH DEBUG)
  const handleLogin = async () => {
    console.log("LOGIN CLICKED");

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      console.log("LOGIN STATUS:", res.status);

      const data = await res.json();
      console.log("LOGIN DATA:", data);

      if (res.ok) {
        localStorage.setItem("token", data.token);
        setLoggedIn(true);
        fetchOrders();
      } else {
        alert(data.error || "Wrong password");
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
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

  // 🗃️ ARCHIVE
  const archiveOrder = async (orderId: number) => {
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
      alert("Archive failed. Refreshing...");
      fetchOrders();
    }
  };

  // ❌ DELETE
  const deleteOrder = async (orderId: number) => {
    if (!window.confirm("Delete permanently?")) return;

    setOrders(prev => prev.filter(order => order.id !== orderId));

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      console.error(err);
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
          style={{ padding: 12, width: 250 }}
        />

        <br />

        <button onClick={handleLogin} style={{ marginTop: 20 }}>
          Login
        </button>
      </div>
    );
  }

  // 📊 DASHBOARD
  return (
    <div style={{ padding: 20 }}>
      <h1>Manager Dashboard</h1>

      <button onClick={handleLogout}>Logout</button>

      <h2>Total Paid Revenue: R{totalPaidRevenue.toFixed(2)}</h2>

      {orders.length > 0 ? (
        orders.map(order => (
          <div key={order.id}>
            <p>#{order.id}</p>
            <p>{order.item_ordered}</p>
            <p>R{order.price}</p>

            <button onClick={() => updateDelivery(order.id, "delivered")}>
              Deliver
            </button>

            <button onClick={() => deleteOrder(order.id)}>
              Delete
            </button>
          </div>
        ))
      ) : (
        <p>No orders</p>
      )}
    </div>
  );
};

export default Manager;
