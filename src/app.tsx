import React, { useState } from 'react';
import { MENU_ITEMS } from './lib/datasource';
import Input from './components/ui/input';
import { useNavigate } from "react-router-dom";

const App: React.FC = () => {

  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [deliveryType, setDeliveryType] = useState<"delivery" | "collection">("delivery");

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

    if (deliveryType === "delivery" && !address.trim()) {
      alert("Please enter delivery address!");
      return;
    }

    if (!phone.trim()) {
      alert("Please enter phone number!");
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
          address: deliveryType === "delivery" ? address : "COLLECTION",
          phone: phone,
          delivery_type: deliveryType
        })
      });

      if (!response.ok) {
        throw new Error("Server error while saving order");
      }

      const data = await response.json();
      const orderId = data?.order?.id;

      if (!orderId) {
        alert("Order ID not returned");
        return;
      }

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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* HEADER */}
      <header className="py-16 px-4 text-center bg-white border-b shadow-sm mb-10 relative">
        <h1 className="text-4xl font-black">
          Blue <span className="text-blue-600">Plate</span> Special
        </h1>

        {/* MANAGER BUTTON */}
        <button
          onClick={() => navigate("/manager")}
          className="absolute top-6 right-6 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          Manager
        </button>

        {/* ✅ FIXED: GO TO LOGIN FIRST */}
        <button
          onClick={() => navigate("/kitchen-login")}
          className="absolute top-6 right-32 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Kitchen
        </button>

      </header>

      <main className="max-w-6xl mx-auto px-4 pb-20">

        {/* SEARCH */}
        <div className="flex justify-center mb-10">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search food..."
          />
        </div>

        {/* MENU */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-48 object-cover rounded-lg"
              />
              <h3 className="text-xl font-bold mt-3">{item.name}</h3>
              <p>R{item.price}</p>

              <button
                onClick={() => addToCart(item)}
                className="mt-3 w-full bg-blue-600 text-white p-3 rounded"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>

        {/* CART */}
        <div className="mt-16 bg-white p-6 rounded-xl shadow max-w-2xl mx-auto">

          <h2 className="text-xl font-bold mb-4">Cart</h2>

          {cart.map((item, index) => (
            <div key={index} className="flex justify-between mb-2">
              <span>{item.name}</span>
              <button onClick={() => removeFromCart(index)}>Remove</button>
            </div>
          ))}

          <p className="mt-4 font-bold">
            Total: R{cart.reduce((t, i) => t + i.price, 0)}
          </p>

          {/* DELIVERY TYPE */}
          <div className="mt-4">
            <label>
              <input
                type="radio"
                value="delivery"
                checked={deliveryType === "delivery"}
                onChange={() => setDeliveryType("delivery")}
              /> Delivery
            </label>

            <label className="ml-4">
              <input
                type="radio"
                value="collection"
                checked={deliveryType === "collection"}
                onChange={() => setDeliveryType("collection")}
              /> Collection
            </label>
          </div>

          {/* ADDRESS */}
          {deliveryType === "delivery" && (
            <input
              type="text"
              placeholder="Delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full mt-4 p-3 border rounded"
            />
          )}

          {/* PHONE */}
          <input
            type="text"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full mt-4 p-3 border rounded"
          />

          <button
            onClick={handlePlaceOrder}
            className="mt-4 w-full bg-green-600 text-white p-4 rounded"
          >
            Pay & Order
          </button>

        </div>

      </main>
    </div>
  );
};

export default App;