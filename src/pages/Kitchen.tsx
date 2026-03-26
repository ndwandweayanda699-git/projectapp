import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Kitchen: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/kitchen/orders`);
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  // Auto refresh
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update status
  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/kitchen/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      fetchOrders();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🍳 Kitchen Dashboard</h1>

      {orders.length === 0 ? (
        <p>No active orders</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "2px solid black",
                padding: 15,
                width: 260,
                borderRadius: 10,
                background: "#fff",
              }}
            >
              <h3>Order #{order.id}</h3>

              {/* ✅ FIX: use item_ordered */}
              <p><strong>Items:</strong></p>
              <ul>
                {order.item_ordered
                  .split(",")
                  .map((item: string, i: number) => (
                    <li key={i}>{item.trim()}</li>
                  ))}
              </ul>

              {/* ✅ FIX: delivery_status */}
              <p><strong>Status:</strong> {order.delivery_status}</p>

              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => updateStatus(order.id, "preparing")}
                  style={{
                    marginRight: 5,
                    background: "blue",
                    color: "white",
                    padding: "5px 10px",
                    borderRadius: 5,
                  }}
                >
                  🔵 Start
                </button>

                <button
                  onClick={() => updateStatus(order.id, "ready")}
                  style={{
                    background: "green",
                    color: "white",
                    padding: "5px 10px",
                    borderRadius: 5,
                  }}
                >
                  🟢 Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Kitchen;