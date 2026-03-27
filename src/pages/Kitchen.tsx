import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Kitchen: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [knownOrderIds, setKnownOrderIds] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false); // ✅ NEW
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const navigate = useNavigate();

  // 🔐 GET TOKEN
  const token = localStorage.getItem("kitchen_token");

  // 🚨 REDIRECT IF NOT LOGGED IN
  useEffect(() => {
    if (!token) {
      navigate("/kitchen-login");
    }
  }, [token, navigate]);

  // 🔊 LOAD SOUND
  useEffect(() => {
    audioRef.current = new Audio(
      "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
    );
    audioRef.current.volume = 1;
  }, []);

  // 🔊 PLAY SOUND
  const playSound = () => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // 🔥 FETCH ORDERS
  const fetchOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/kitchen/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("kitchen_token");
        navigate("/kitchen-login");
        return;
      }

      const data = await res.json();

      // 🔔 DETECT NEW ORDERS
      const newOrders = data.filter(
        (order: any) => !knownOrderIds.includes(order.id)
      );

      // 🔊 PLAY SOUND ONLY AFTER ENABLED
      if (newOrders.length > 0 && knownOrderIds.length > 0) {
        playSound();
      }

      setKnownOrderIds(data.map((o: any) => o.id));
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  // 🔁 AUTO REFRESH
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 UPDATE STATUS
  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/kitchen/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      fetchOrders();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // 🔥 SPLIT ORDERS
  const activeOrders = orders.filter(
    (o) => o.delivery_status !== "ready"
  );

  const completedOrders = orders.filter(
    (o) => o.delivery_status === "ready"
  );

  return (
    <div style={{ padding: 20 }}>
      <h1>🍳 Kitchen Dashboard</h1>

      {/* 🔊 ENABLE SOUND BUTTON (EXACT PLACE) */}
      {!soundEnabled && (
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current.currentTime = 0;
                setSoundEnabled(true);
                alert("Sound Enabled ✅");
              }).catch(() => {});
            }
          }}
          style={{
            marginBottom: 10,
            padding: "8px 12px",
            background: "orange",
            color: "black",
            borderRadius: 5,
            border: "none",
            cursor: "pointer"
          }}
        >
          🔊 Enable Sound
        </button>
      )}

      {/* 🔐 LOGOUT */}
      <button
        onClick={() => {
          localStorage.removeItem("kitchen_token");
          navigate("/kitchen-login");
        }}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: "8px 12px",
          background: "black",
          color: "white",
          borderRadius: 5,
        }}
      >
        Logout
      </button>

      {/* 🔥 ACTIVE ORDERS */}
      <h2 style={{ marginTop: 20 }}>🟡 Active Orders</h2>

      {activeOrders.length === 0 ? (
        <p>No active orders</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {activeOrders.map((order) => (
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

              <ul>
                {order.item_ordered.split(",").map((item: string, i: number) => (
                  <li key={i}>{item.trim()}</li>
                ))}
              </ul>

              <p>Status: {order.delivery_status}</p>

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
          ))}
        </div>
      )}

      {/* 🔥 COMPLETED ORDERS */}
      <h2 style={{ marginTop: 40 }}>✅ Completed Orders</h2>

      {completedOrders.length === 0 ? (
        <p>No completed orders</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {completedOrders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "2px solid green",
                padding: 15,
                width: 260,
                borderRadius: 10,
                background: "#e6ffe6",
              }}
            >
              <h3>Order #{order.id}</h3>

              <ul>
                {order.item_ordered.split(",").map((item: string, i: number) => (
                  <li key={i}>{item.trim()}</li>
                ))}
              </ul>

              <p>Status: ✅ Ready</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Kitchen;