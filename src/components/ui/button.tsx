import React from "react";

const PaymentButton = () => {

  const handlePayment = () => {

    const yoco = new window.YocoSDK({
      publicKey: "pk_test_d902844fJv1PIklc8a74"
    });

    yoco.showPopup({
      amountInCents: 12000,
      currency: "ZAR",
      name: "My Food App",
      description: "Order Payment",

      callback: async function (result: any) {

        if (result.error) {
          alert("Payment failed: " + result.error.message);
          return;
        }

        const token = result.id;

        try {

          const response = await fetch("https://your-backend-url.onrender.com/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              user_id: 1,
              item_ordered: "Pizza",
              price: 120,
              payment_method: "card",
              token: token
            })
          });

          const data = await response.json();

          if (response.ok) {
            alert("Payment successful! Order ID: " + data.order.id);
          } else {
            alert("Payment failed");
          }

        } catch (error) {
          console.error(error);
          alert("Server error");
        }

      }

    });

  };

  return (
    <button onClick={handlePayment}>
      Pay with Card
    </button>
  );

};

export default PaymentButton;