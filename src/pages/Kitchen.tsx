import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Kitchen: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const prevOrderIdsRef = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null); // ✅ SINGLE AUDIO

  const navigate = useNavigate();
  const token = localStorage.getItem("kitchen_token");

  // 🚨 Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/kitchen-login");
    }
  }, [token, navigate]);

  // 🔊 LOAD AUDIO ONCE
  useEffect(() => {
    audioRef.current = new Audio(
      "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
    );
    audioRef.current.volume = 1;
    audioRef.current.preload = "auto";
  }, []);

  // 🔊 PLAY SOUND (FIXED)
  const playSound = () => {
    if (!soundEnabled || !audioRef.current) return;

    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      audioRef.current.play().then(() => {
        console.log("🔊 SOUND PLAYED");
      }).catch((err) => {
        console.log("❌ Sound blocked:", err);
      });

    } catch (err) {
      console.log("Sound error:", err);
    }
  };

  // 🔥 Fetch orders
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

      const prevIds = prevOrderIdsRef.current;
      const currentIds = data.map((o: any) => o.id);

      // ✅ Detect NEW orders properly
      const hasNewOrder = currentIds.some(
        (id) => !prevIds.includes(id)
      );

      if (hasNewOrder && prevIds.length > 0) {
        console.log("🔔 NEW ORDER DETECTED");
        playSound();
      }

      prevOrderIdsRef.current = currentIds;
      setOrders(data);

    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  // 🔁 Auto refresh
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 Update status
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

  const activeOrders = orders.filter(
    (o) => o.delivery_status !== "ready"
  );

  const completedOrders = orders.filter(
    (o) => o.delivery_status === "ready"
  );

  return (
    <div style={{ padding: 20 }}>
      <h1>🍳 Kitchen Dashboard</h1>

      {/* 🔊 ENABLE SOUND (CRITICAL FIX) */}
      {!soundEnabled && (
        <button
          onClick={() => {
            if (!audioRef.current) return;

            audioRef.current.play().then(() => {
              audioRef.current?.pause();
              audioRef.current.currentTime = 0;

              setSoundEnabled(true);
              alert("Sound Enabled ✅");
            }).catch(() => {
              alert("Click again to enable sound");
            });
          }}
          style={{
            marginBottom: 10,
            padding: "8px 12px",
            background: "orange",
            borderRadius: 5,
            border: "none",
            cursor: "pointer",
          }}
        >
          🔊 Enable Sound
        </button>
      )}

      {/* Logout */}
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

      {/* Active Orders */}
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
              }}
            >
              <h3>Order #{order.id}</h3>

              <ul>
                {order.item_ordered.split(",").map((item: string, i: number) => (
                  <li key={i}>{item.trim()}</li>
                ))}
              </ul>

              <p>Status: {order.delivery_status}</p>

              <button onClick={() => updateStatus(order.id, "preparing")}>
                🔵 Start
              </button>

              <button onClick={() => updateStatus(order.id, "ready")}>
                🟢 Done
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
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
              <p>✅ Ready</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Kitchen;