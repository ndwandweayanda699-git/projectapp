import { useEffect } from "react";

export default function Success() {

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");

    if (!orderId) {
      console.error("No order_id found in URL");
      return;
    }

    fetch("https://projectapp-backend-u0fx.onrender.com/api/confirm-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id: Number(orderId) // convert string → number
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error("Failed to confirm payment");
      }
      return res.json();
    })
    .then((data) => {
      console.log("Payment confirmed:", data);
    })
    .catch((err) => {
      console.error("Payment confirmation error:", err);
    });

  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>✅ Payment Successful</h1>
      <p>Your order has been confirmed.</p>
    </div>
  );

}