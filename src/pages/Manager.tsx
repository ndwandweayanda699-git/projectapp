import React, { useEffect, useState } from "react";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Manager: React.FC = () => {

  const [orders, setOrders] = useState<any[]>([]);

  // Fetch orders from backend
  const fetchOrders = async () => {
    const res = await fetch(`${BACKEND_URL}/api/orders`);
    const data = await res.json();
    setOrders(data);
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateDelivery = async (orderId: number, status: string) => {
    await fetch(`${BACKEND_URL}/api/update-delivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id: orderId,
        status
      })
    });

    fetchOrders();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Manager Dashboard</h1>

      {orders.map(order => (
        <div key={order.id} style={{ border: "1px solid black", margin: 10, padding: 10 }}>
          <p><b>Order:</b> {order.id}</p>
          <p><b>Items:</b> {order.item_ordered}</p>
          <p><b>Price:</b> R{order.price}</p>
          <p><b>Address:</b> {order.address}</p>

          <p>
            <b>Payment:</b> {order.payment_status}
          </p>

          <p>
            <b>Delivery:</b> {order.delivery_status}
          </p>

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