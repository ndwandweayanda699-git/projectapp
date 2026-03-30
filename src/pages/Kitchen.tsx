import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

// ==============================
// 🔧 TYPES
// ==============================
type Order = {
  id: number;
  item_ordered: string;
  delivery_status: string;
};

const Kitchen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // ✅ POPUP STATE
  const [message, setMessage] = useState("");

  const audioRef = useRef<HTMLAudioElement>(
    new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg")
  );

  const prevOrderIdsRef = useRef<Set<number>>(new Set());

  const navigate = useNavigate();
  const token = localStorage.getItem("kitchen_token");

  // 🚨 Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/kitchen-login");
    }
  }, [token, navigate]);

  // 🔊 Configure audio
  useEffect(() => {
    audioRef.current.volume = 1;
    audioRef.current.preload = "auto";
  }, []);

  // 🔊 PLAY SOUND
  const playSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => console.warn("🔇 Browser blocked sound"));
      }
    } catch (err) {
      console.error("Sound error:", err);
    }
  }, [soundEnabled]);

  // 🔥 FETCH ORDERS
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

      const data: Order[] = await res.json();

      const prevIds = prevOrderIdsRef.current;
      const currentIds = new Set(data.map((o) => o.id));

      let hasNewOrder = false;
      currentIds.forEach((id) => {
        if (!prevIds.has(id)) hasNewOrder = true;
      });

      if (hasNewOrder && prevIds.size > 0) {
        console.log("🔔 NEW ORDER RECEIVED");
        playSound();
      }

      prevOrderIdsRef.current = currentIds;
      setOrders(data);

    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [token, navigate, playSound]);

  // 🔁 AUTO REFRESH
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // 🔥 UPDATE STATUS
  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/kitchen/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Update failed");

      fetchOrders();

    } catch (err) {
      console.error("❌ Update failed:", err);
      setMessage("Failed to update order"); // ✅ replaced alert
    }
  };

  // 📊 FILTERS
  const activeOrders = orders.filter((o) => o.delivery_status !== "ready");
  const completedOrders = orders.filter((o) => o.delivery_status === "ready");

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", background: "#f4f4f9", minHeight: "100vh" }}>

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

      <h1 style={{ borderBottom: "2px solid #333" }}>🍳 Kitchen Dashboard</h1>

      {/* SOUND */}
      {!soundEnabled ? (
        <button
          onClick={() => {
            audioRef.current.play()
              .then(() => {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setSoundEnabled(true);
              })
              .catch(() => setMessage("Click again to enable sound"))} // ✅ replaced alert
          }
          style={{ marginBottom: 20, padding: 12, background: "#ff9800", color: "white", borderRadius: 8 }}
        >
          🔔 Enable Order Alerts
        </button>
      ) : (
        <p style={{ color: "green" }}>✅ Audio Alerts Active</p>
      )}

      {/* LOGOUT */}
      <button
        onClick={() => {
          localStorage.removeItem("kitchen_token");
          navigate("/kitchen-login");
        }}
        style={{ position: "absolute", top: 20, right: 20 }}
      >
        Logout
      </button>

      {/* ACTIVE */}
      <h2>🟡 Active Orders ({activeOrders.length})</h2>

      {activeOrders.map((order) => (
        <div key={order.id} style={{ border: "1px solid #333", padding: 15, marginBottom: 10 }}>
          <h3>Order #{order.id}</h3>

          <ul>
            {order.item_ordered.split(",").map((item, i) => (
              <li key={i}>{item.trim()}</li>
            ))}
          </ul>

          <p>
            Status:{" "}
            <strong style={{ color: order.delivery_status === "preparing" ? "blue" : "gray" }}>
              {order.delivery_status || "pending"}
            </strong>
          </p>

          <button onClick={() => updateStatus(order.id, "preparing")}>
            Start
          </button>

          <button onClick={() => updateStatus(order.id, "ready")}>
            Done
          </button>
        </div>
      ))}

      {/* COMPLETED */}
      {completedOrders.length > 0 && (
        <>
          <h2>✅ Completed</h2>
          {completedOrders.map((order) => (
            <div key={order.id}>
              Order #{order.id} - Ready
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Kitchen;
