import { useEffect } from "react";

export default function Success() {

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");

    if (orderId) {

      fetch("https://projectapp-backend-u0fx.onrender.com/api/confirm-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          order_id: orderId
        })
      })
      .then(res => res.json())
      .then(data => console.log("Payment confirmed:", data))
      .catch(err => console.error(err));

    }

  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>✅ Payment Successful</h1>
      <p>Your order has been confirmed.</p>
    </div>
  );

}