import React, { useState } from 'react';
import { MENU_ITEMS } from './lib/datasource';
import Input from './components/ui/input';
import { Routes, Route } from "react-router-dom";
import Manager from "./pages/Manager";

// ==============================
// 🟢 MAIN APP UI
// ==============================

const MainApp: React.FC = () => {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [address, setAddress] = useState("");

  const filteredItems = MENU_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: any) => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  const handlePlaceOrder = async () => {

    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (!address.trim()) {
      alert("Please enter delivery address!");
      return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
    const orderRef = "Order-" + Date.now();
    const itemOrdered = cart.map((item) => item.name).join(", ");

    try {

      const response = await fetch("https://projectapp-backend-u0fx.onrender.com/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: 1,
          item_ordered: itemOrdered,
          price: totalAmount,
          payment_method: "yoco",
          address: address
        })
      });

      const data = await response.json();
      const orderId = data?.order?.id;

      const successUrl = `https://projectapp-sk4p.onrender.com/success?order_id=${orderId}`;

      const paymentUrl =
        `https://pay.yoco.com/sizakala?amount=${totalAmount}` +
        `&reference=${orderRef}` +
        `&metadata[order_id]=${orderId}` +
        `&successUrl=${encodeURIComponent(successUrl)}` +
        `&cancelUrl=${encodeURIComponent(successUrl)}`;

      window.location.href = paymentUrl;

    } catch (error) {
      console.error(error);
      alert("Order failed");
    }
  };

  return (
    <div>
      {/* YOUR UI (unchanged) */}
    </div>
  );
};

// ==============================
// ✅ FIXED ROUTES (NO ROUTER HERE)
// ==============================

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/manager" element={<Manager />} />
    </Routes>
  );
};

export default App;