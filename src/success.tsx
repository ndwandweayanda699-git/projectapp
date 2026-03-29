import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Success: React.FC = () => {
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");

  useEffect(() => {
    // ⏳ Auto redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate("/");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>✅ Payment Successful</h1>

      <p>
        Your order <strong>#{orderId}</strong> has been received.
      </p>

      <p>Preparing your food 🍔...</p>
      <p>Redirecting to menu...</p>

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "green",
          color: "white",
          borderRadius: 6
        }}
      >
        Back to Menu
      </button>
    </div>
  );
};

export default Success;g