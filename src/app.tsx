import React, { useEffect, useState } from 'react';
import Input from './components/ui/input';
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const App: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "collection">("delivery");

  // ✅ FETCH MENU
  const fetchMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu`);
      const data = await res.json();

      // 🔥 Ensure price is always a number
      const cleanData = data.map((item: any) => ({
        ...item,
        price: Number(item.price)
      }));

      setMenu(cleanData);
    } catch (err) {
      console.error("Menu fetch error:", err);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // ✅ SEARCH
  const filteredItems = menu.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ ADD TO CART (safe)
  const addToCart = (item: any) => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  const handlePlaceOrder = async () => {
    if (loading) return;

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

    setLoading(true);

    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    const orderRef = "Order-" + Date.now();
    const itemOrdered = cart.map((item) => item.name).join(", ");

    try {
      const response = await fetch(`${BACKEND_URL}/api/orders`, {
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

      const data = await response.json();
      const orderId = data?.order?.id;

      if (!orderId) {
        alert("Order failed");
        setLoading(false);
        return;
      }

      const successUrl = `https://projectapp-sk4p.onrender.com/success?order_id=${orderId}`;

      const paymentUrl = new URL(`https://pay.yoco.com/sizakala`);
      paymentUrl.searchParams.append("amount", totalAmount.toString());
      paymentUrl.searchParams.append("reference", orderRef);
      paymentUrl.searchParams.append("metadata[order_id]", orderId.toString());
      paymentUrl.searchParams.append("successUrl", successUrl);
      paymentUrl.searchParams.append("cancelUrl", successUrl);

      setCart([]);
      window.location.href = paymentUrl.toString();

    } catch (error) {
      console.error("Order failed:", error);
      alert("Order failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* HEADER */}
      <header className="py-16 px-4 text-center bg-white border-b shadow-sm mb-10 relative">
        <h1 className="text-4xl font-black">
          Blue <span className="text-blue-600">Plate</span> Special
        </h1>

        <button
          onClick={() => navigate("/manager")}
          className="absolute top-6 right-6 bg-black text-white px-4 py-2 rounded-lg"
        >
          Manager
        </button>

        <button
          onClick={() => navigate("/kitchen-login")}
          className="absolute top-6 right-32 bg-green-600 text-white px-4 py-2 rounded-lg"
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

              {/* ✅ FIXED IMAGE */}
              <img
                src={`${BACKEND_URL}${item.image}`}
                alt={item.name}
                onError={(e) => (e.currentTarget.style.display = "none")}
                className="w-full h-40 object-cover rounded-lg"
              />

              <h3 className="text-xl font-bold mt-3">{item.name}</h3>

              <p className="text-blue-600 font-semibold">
                R{item.price}
              </p>

              <button
                onClick={() => addToCart(item)}
                className="mt-3 w-full bg-blue-600 text-white p-3 rounded-lg"
              >
                Add to Cart
              </button>

            </div>
          ))}
        </div>

        {/* CART */}
        <div className="mt-16 bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto border">
          <h2 className="text-2xl font-bold mb-6">Your Cart</h2>

          {cart.length === 0 ? (
            <p className="text-gray-500 italic">Your cart is empty.</p>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex justify-between mb-2">
                <span>{item.name} - R{item.price}</span>
                <button onClick={() => removeFromCart(index)}>Remove</button>
              </div>
            ))
          )}

          <p className="mt-4 font-bold">
            Total: R{cart.reduce((t, i) => t + i.price, 0)}
          </p>

          {/* DELIVERY TYPE */}
          <div className="mt-6 flex gap-6">
            <label>
              <input
                type="radio"
                checked={deliveryType === "delivery"}
                onChange={() => setDeliveryType("delivery")}
              /> Delivery
            </label>

            <label>
              <input
                type="radio"
                checked={deliveryType === "collection"}
                onChange={() => setDeliveryType("collection")}
              /> Collection
            </label>
          </div>

          {deliveryType === "delivery" && (
            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full mt-4 p-3 border"
            />
          )}

          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full mt-4 p-3 border"
          />

          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="mt-6 w-full bg-green-600 text-white p-3 rounded"
          >
            {loading ? "Processing..." : "Pay & Order"}
          </button>
        </div>

      </main>
    </div>
  );
};

export default App;