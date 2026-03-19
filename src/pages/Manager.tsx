import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Manager: React.FC = () => {

  const [orders, setOrders] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // ==============================
  // 🔐 LOGIN FUNCTION
  // ==============================

  const handleLogin = async () => {

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
    } else {
      alert("Wrong password");
    }
  };

  // ==============================
  // 📦 FETCH ORDERS (WITH TOKEN)
  // ==============================

  const fetchOrders = async () => {

    const token = localStorage.getItem("token");

    const res = await fetch(`${BACKEND_URL}/api/orders`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setOrders(data);
  };

  useEffect(() => {

    const token = localStorage.getItem("token");

    if (token) {
      setLoggedIn(true);
      fetchOrders();
    }

    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);

  }, []);

  // ==============================
  // 🚚 UPDATE DELIVERY (WITH TOKEN)
  // ==============================

  const updateDelivery = async (orderId: number, status: string) => {

    const token = localStorage.getItem("token");

    await fetch(`${BACKEND_URL}/api/update-delivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        order_id: orderId,
        status
      })
    });

    fetchOrders();
  };

  // ==============================
  // 🔐 LOGIN SCREEN
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
          style={{ padding: 10, marginTop: 20 }}
        />

        <br />

        <button
          onClick={handleLogin}
          style={{ marginTop: 20, padding: 10 }}
        >
          Login
        </button>
      </div>
    );
  }

  // ==============================
  // 📊 DASHBOARD
  // ==============================

  return (
    <div style={{ padding: 20 }}>
      <h1>Manager Dashboard</h1>

      {orders.map(order => (
        <div key={order.id} style={{ border: "1px solid black", margin: 10, padding: 10 }}>

          <p><b>Order:</b> {order.id}</p>
          <p><b>Items:</b> {order.item_ordered}</p>
          <p><b>Price:</b> R{order.price}</p>
          <p><b>Address:</b> {order.address}</p>

          <p><b>Payment:</b> {order.payment_status}</p>
          <p><b>Delivery:</b> {order.delivery_status}</p>

          {order.payment_status === "paid" && order.delivery_status === "pending" && (
            <button onClick={() => updateDelivery(order.id, "out_for_delivery")}>
              Start Delivery
            </button>
          )}

          {order.delivery_status === "out_for_delivery" && (
            <button onClick={() => updateDelivery(order.id, "delivered")}>
              Mark Delivered
            </button>
          )}

        </div>
      ))}
    </div>
  );
};

export default Manager;