import React, { useEffect, useState, useCallback } from "react";

// ⚠️ Make sure this URL matches your Render Dashboard exactly!
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

  // 📥 FETCH ORDERS (Wrapped in useCallback to prevent infinite loops)
  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setIsRefreshing(true);
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      // PROTECT AGAINST .MAP() CRASH
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        console.error("Backend sent non-array data:", data);
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
        alert(data.message || "Wrong password");
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

    // Only set interval if logged in to save resources
    let interval: any;
    if (loggedIn || token) {
      interval = setInterval(fetchOrders, 5000);
    }

    return () => clearInterval(interval);
  }, [loggedIn, fetchOrders]);

  // 🚚 ACTIONS (Delivery, Archive, Delete)
  const updateDelivery = async (orderId: number, status: string) => {
    await fetch(`${BACKEND_URL}/api/update-delivery`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ order_id: orderId, status })
    });
    fetchOrders();
  };

  const archiveOrder = async (orderId: number) => {
    await fetch(`${BACKEND_URL}/api/archive-order`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ order_id: orderId })
    });
    fetchOrders();
  };

  const deleteOrder = async (orderId: number) => {
    if (!window.confirm("Delete permanently?")) return;
    await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });
    fetchOrders();
  };

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
          style={{ padding: 10, width: 200 }}
        />
        <br />
        <button onClick={handleLogin} style={{ marginTop: 20, padding: "10px 20px" }}>
          Login
        </button>
      </div>
    );
  }

  // 📊 DASHBOARD
  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Manager Dashboard {isRefreshing && <small style={{fontSize: '0.5em'}}>Refreshing...</small>}</h1>
        <button onClick={handleLogout} style={{ height: 30, marginTop: 20 }}>Logout</button>
      </div>

      {Array.isArray(orders) && orders.length > 0 ? (
        orders.map(order => (
          <div key={order.id} style={{ border: "1px solid #ccc", borderRadius: 8, margin: "10px 0", padding: 15, backgroundColor: '#f9f9f9' }}>
            <p><b>Order:</b> #{order.id}</p>
            <p><b>Items:</b> {order.item_ordered}</p>
            <p><b>Price:</b> R{order.price}</p>
            <p><b>Status:</b> <span style={{ color: 'blue' }}>{order.delivery_status}</span> ({order.payment_status})</p>
            <p><b>Address:</b> {order.address}</p>

            <div style={{ marginTop: 10 }}>
              {order.payment_status === "paid" && order.delivery_status === "pending" && (
                <button onClick={() => updateDelivery(order.id, "out_for_delivery")} style={{ marginRight: 5, background: 'green', color: 'white' }}>
                  Start Delivery
                </button>
              )}

              {order.delivery_status === "out_for_delivery" && (
                <button onClick={() => updateDelivery(order.id, "delivered")} style={{ marginRight: 5, background: 'blue', color: 'white' }}>
                  Mark Delivered
                </button>
              )}

              <button onClick={() => archiveOrder(order.id)} style={{ marginRight: 5 }}>Archive</button>
              <button onClick={() => deleteOrder(order.id)} style={{ background: "red", color: "white" }}>Delete</button>
            </div>
          </div>
        ))
      ) : (
        <p>No active orders found.</p>
      )}
    </div>
  );
};

export default Manager;
