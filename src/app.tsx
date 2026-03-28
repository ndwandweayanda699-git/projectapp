import React, { useState } from 'react';
import { MENU_ITEMS } from './lib/datasource';
import Input from './components/ui/input';
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const App: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
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

    // Calculate total
    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    // NOTE: Yoco Pay Links (slug-based) usually expect Rands in the URL.
    // If your screenshot showed R8800 for amount=8800, we should send totalAmount (88).
    const orderRef = "Order-" + Date.now();
    const itemOrdered = cart.map((item) => item.name).join(", ");

    try {
      console.log("🧾 Creating order in database...");

      const response = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: 1,
          item_ordered: itemOrdered,
          price: totalAmount, // Saved as Rands in DB
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
        setLoading(false);
        return;
      }

      console.log("✅ Order created:", orderId);

      const successUrl = `https://projectapp-sk4p.onrender.com/success?order_id=${orderId}`;

      // 🔥 FIXED YOCO URL: Using totalAmount instead of cents to fix the R8800 error.
      // Also ensuring proper URL encoding for success/cancel links.
      const paymentUrl = new URL(`https://pay.yoco.com/sizakala`);
      paymentUrl.searchParams.append("amount", totalAmount.toString());
      paymentUrl.searchParams.append("reference", orderRef);
      paymentUrl.searchParams.append("metadata[order_id]", orderId.toString());
      paymentUrl.searchParams.append("successUrl", successUrl);
      paymentUrl.searchParams.append("cancelUrl", successUrl);

      console.log("➡️ Redirecting to Yoco:", paymentUrl.toString());

      setCart([]); // Clear cart
      window.location.href = paymentUrl.toString();

    } catch (error) {
      console.error("❌ Order failed:", error);
      alert("Order failed. Please try again.");
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
          className="absolute top-6 right-6 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
        >
          Manager
        </button>

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
              <p className="text-blue-600 font-semibold">R{item.price}</p>

              <button
                onClick={() => addToCart(item)}
                className="mt-3 w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
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
              <div key={index} className="flex justify-between items-center mb-3 border-b pb-2">
                <span>{item.name} - R{item.price}</span>
                <button
                  onClick={() => removeFromCart(index)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
            ))
          )}

          <div className="mt-6 pt-4 border-t">
            <p className="text-xl font-bold">
              Total: R{cart.reduce((t, i) => t + i.price, 0)}
            </p>
          </div>

          {/* DELIVERY TYPE */}
          <div className="mt-6 flex gap-6 p-4 bg-slate-50 rounded-lg">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                className="mr-2"
                checked={deliveryType === "delivery"}
                onChange={() => setDeliveryType("delivery")}
              /> Delivery
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                className="mr-2"
                checked={deliveryType === "collection"}
                onChange={() => setDeliveryType("collection")}
              /> Collection
            </label>
          </div>

          {/* ADDRESS */}
          {deliveryType === "delivery" && (
            <input
              type="text"
              placeholder="Full Delivery Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full mt-4 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          )}

          {/* PHONE */}
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full mt-4 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className={`mt-8 w-full p-4 rounded-lg text-white font-bold text-lg transition-all ${
              loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700 shadow-md"
            }`}
          >
            {loading ? "Processing..." : "Pay & Order Now"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
