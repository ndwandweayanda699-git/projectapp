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

  // ✅ NEW
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ==============================
  // 🍔 FETCH MENU
  // ==============================
  const fetchMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu`);
      const data = await res.json();

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

  // ==============================
  // 🔍 SEARCH
  // ==============================
  const filteredItems = menu.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // ==============================
  // 🛒 CART
  // ==============================
  const addToCart = (item: any) => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  // ==============================
  // 💳 PAY
  // ==============================
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

    // ✅ TERMS CHECK
    if (!acceptedTerms) {
      alert("Please accept Terms & Conditions before ordering.");
      return;
    }

    setLoading(true);

    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
    const itemOrdered = cart.map((item) => item.name).join(", ");

    try {
      const res = await fetch(`${BACKEND_URL}/api/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: 1,
          item_ordered: itemOrdered,
          price: totalAmount,
          address: deliveryType === "delivery" ? address : "COLLECTION",
          phone: phone,
          delivery_type: deliveryType
        })
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        alert(data.error || "Payment failed");
        setLoading(false);
        return;
      }

      if (data.orderNumber) {
        localStorage.setItem("orderNumber", data.orderNumber);
      }

      if (data.order?.id) {
        localStorage.setItem("orderId", data.order.id.toString());
      }

      setCart([]);
      window.location.href = data.checkoutUrl;

    } catch (error) {
      alert("Payment failed");
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

              <img
                src={`${BACKEND_URL}${item.image}`}
                alt={item.name}
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

          {cart.map((item, index) => (
            <div key={index} className="flex justify-between mb-2">
              <span>{item.name} - R{item.price}</span>
              <button onClick={() => removeFromCart(index)}>Remove</button>
            </div>
          ))}

          <p className="mt-4 font-bold">
            Total: R{cart.reduce((t, i) => t + i.price, 0)}
          </p>

          {/* TERMS & CONDITIONS */}
          <div className="mt-6 p-4 border rounded bg-gray-50 text-sm">
            <h3 className="font-bold mb-2">Terms & Conditions</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>No refunds once payment is completed.</li>
              <li>Please ensure your order is correct before paying.</li>
              <li>Delivery times may vary during peak hours.</li>
              <li>Collection orders must be picked up within 30 minutes.</li>
            </ul>

            <label className="flex items-center mt-4">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={() => setAcceptedTerms(!acceptedTerms)}
                className="mr-2"
              />
              I agree to the Terms & Conditions
            </label>
          </div>

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