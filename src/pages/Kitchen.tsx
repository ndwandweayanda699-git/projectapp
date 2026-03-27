import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Kitchen: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // ✅ Initialize Audio immediately to avoid null checks during fast updates
  const audioRef = useRef<HTMLAudioElement>(
    new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg")
  );
  const prevOrderIdsRef = useRef<number[]>([]);

  const navigate = useNavigate();
  const token = localStorage.getItem("kitchen_token");

  // 🚨 Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/kitchen-login");
    }
  }, [token, navigate]);

  // 🔊 Configure audio settings on mount
  useEffect(() => {
    audioRef.current.volume = 1;
    audioRef.current.preload = "auto";
  }, []);

  // 🔊 PLAY SOUND (FIXED)
  const playSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn("❌ Sound blocked by browser settings:", err);
      });
    } catch (err) {
      console.error("Sound error:", err);
    }
  }, [soundEnabled]);

  // 🔥 Fetch orders (Memoized to prevent stale state in setInterval)
  const fetchOrders = useCallback(async () => {
    if (!token) return;

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
      const hasNewOrder = currentIds.some((id) => !prevIds.includes(id));

      if (hasNewOrder && prevIds.length > 0) {
        console.log("🔔 NEW ORDER DETECTED");
        playSound();
      }

      prevOrderIdsRef.current = currentIds;
      setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  }, [token, navigate, playSound]);

  // 🔁 Auto refresh (Correctly depends on fetchOrders)
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

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

  const activeOrders = orders.filter((o) => o.delivery_status !== "ready");
  const completedOrders = orders.filter((o) => o.delivery_status === "ready");

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>🍳 Kitchen Dashboard</h1>

      {/* 🔊 ENABLE SOUND (BROWSER REQUIREMENT) */}
      {!soundEnabled ? (
        <button
          onClick={() => {
            // Playing then pausing immediately "unlocks" audio for this tab
            audioRef.current.play().then(() => {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              setSoundEnabled(true);
            }).catch(() => alert("Please click again to allow sound."));
          }}
          style={{
            marginBottom: 20,
            padding: "12px 20px",
            background: "#ff9800",
            color: "white",
            fontWeight: "bold",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}
        >
          🔔 Enable Order Alerts
        </button>
      ) : (
        <div style={{ color: "green", marginBottom: 20 }}>✅ Alerts Active</div>
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
          background: "#333",
          color: "white",
          borderRadius: 5,
          cursor: "pointer"
        }}
      >
        Logout
      </button>

      <hr />

      {/* Active Orders */}
      <h2 style={{ marginTop: 20 }}>🟡 Active Orders ({activeOrders.length})</h2>
      {activeOrders.length === 0 ? (
        <p>No active orders</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {activeOrders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "2px solid #333",
                padding: 15,
                width: 260,
                borderRadius: 10,
                backgroundColor: "#fff"
              }}
            >
              <h3>Order #{order.id}</h3>
              <ul style={{ paddingLeft: 20 }}>
                {order.item_ordered.split(",").map((item: string, i: number) => (
                  <li key={i}>{item.trim()}</li>
                ))}
              </ul>
              <p><strong>Status:</strong> {order.delivery_status}</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={{ cursor: 'pointer', padding: '5px 10px' }}
                  onClick={() => updateStatus(order.id, "preparing")}
                >
                  🔵 Start
                </button>
                <button
                  style={{ cursor: 'pointer', padding: '5px 10px' }}
                  onClick={() => updateStatus(order.id, "ready")}
                >
                  🟢 Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Orders */}
      <h2 style={{ marginTop: 40 }}>✅ Recently Completed</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {completedOrders.map((order) => (
          <div
            key={order.id}
            style={{
              border: "1px solid #ccc",
              padding: 15,
              width: 260,
              borderRadius: 10,
              background: "#f9f9f9",
              opacity: 0.8
            }}
          >
            <h3>Order #{order.id}</h3>
            <p style={{ color: "green" }}>✅ Ready for Pickup</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Kitchen;
