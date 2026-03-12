import { useEffect } from "react";

export default function Success() {

  useEffect(() => {

    fetch("https://projectapp-backend-u0fx.onrender.com/confirm-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order_id: 1
      })
    });

  }, []);

  return (
    <div style={{textAlign:"center", marginTop:"100px"}}>
      <h1>Payment Successful 🎉</h1>
      <p>Your order has been confirmed.</p>
    </div>
  );

}