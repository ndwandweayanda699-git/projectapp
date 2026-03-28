import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const Kitchen: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(
    new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg")
  );

  // ✅ Use Set for robust new order detection
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

      const data = await res.json();
      const prevIds = prevOrderIdsRef.current;
      const currentIds = new Set(data.map((o: any) => o.id));

      // ✅ Detect new orders accurately
      let hasNewOrder = false;
      currentIds.forEach((id) => {
        if (!prevIds.has(id)) {
          hasNewOrder = true;
        }
      });

      // 🔔 Only play if NOT first load and new order found
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

  // 🔁 AUTO REFRESH (3 Seconds)
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
      fetchOrders(); // Refresh immediately

    } catch (err) {
      console.error("❌ Update failed:", err);
      alert("Failed to update order");
    }
  };

  // ✅ Since backend only sends 'paid' orders, we just filter by delivery status
  const activeOrders = orders.filter((o) => o.delivery_status !== "ready");
  const completedOrders = orders.filter((o) => o.delivery_status === "ready");

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", backgroundColor: '#f4f4f9', minHeight: '100vh' }}>
      <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>🍳 Kitchen Dashboard</h1>

      {/* 🔊 ENABLE SOUND */}
      {!soundEnabled ? (
        <button
          onClick={() => {
            audioRef.current.play()
              .then(() => {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setSoundEnabled(true);
              })
              .catch(() => alert("Click again to enable sound"));
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
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          🔔 Enable Order Alerts
        </button>
      ) : (
        <div style={{ color: "green", fontWeight: 'bold', marginBottom: 20 }}>
          ✅ Audio Alerts Active
        </div>
      )}

      {/* LOGOUT */}
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

      {/* ACTIVE ORDERS */}
      <h2 style={{ marginTop: 20, color: '#d97706' }}>
        🟡 Active Paid Orders ({activeOrders.length})
      </h2>

      {activeOrders.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: '#666' }}>Waiting for new paid orders...</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {activeOrders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "2px solid #333",
                padding: 20,
                width: 280,
                borderRadius: 12,
                backgroundColor: "#fff",
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Order #{order.id}</h3>
                <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>PAID</span>
              </div>

              <ul style={{ paddingLeft: 20, margin: '15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                {order.item_ordered.split(",").map((item: string, i: number) => (
                  <li key={i} style={{ marginBottom: '5px' }}>{item.trim()}</li>
                ))}
              </ul>

              <p style={{ fontSize: '14px' }}>
                <strong>Status:</strong>
                <span style={{ color: order.delivery_status === 'preparing' ? '#2563eb' : '#666', marginLeft: '5px', textTransform: 'capitalize' }}>
                  {order.delivery_status}
                </span>
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: '15px' }}>
                <button
                  onClick={() => updateStatus(order.id, "preparing")}
                  style={{ flex: 1, padding: '8px', cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                  Start
                </button>

                <button
                  onClick={() => updateStatus(order.id, "ready")}
                  style={{ flex: 1, padding: '8px', cursor: 'pointer', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                  Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPLETED */}
      {completedOrders.length > 0 && (
        <>
          <h2 style={{ marginTop: 40, color: '#059669' }}>✅ Recently Completed</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            {completedOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  border: "1px solid #ccc",
                  padding: 15,
                  width: 260,
                  borderRadius: 10,
                  background: "#f0fdf4",
                  opacity: 0.9
                }}
              >
                <h3 style={{ margin: 0 }}>Order #{order.id}</h3>
                <p style={{ color: "green", fontWeight: 'bold', margin: '10px 0 0 0' }}>✅ Ready for Pickup</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Kitchen;
