import React, { useEffect, useState } from 'react';
import Input from './components/ui/input';
import { useNavigate } from "react-router-dom";

// ==============================
// 🔧 TYPES (TS)
// ==============================
type MenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
};

type CartItem = MenuItem;

// ==============================
// 🔗 CONFIG
// ==============================
const BACKEND_URL = "https://projectapp-backend-u0fx.onrender.com";

const App: React.FC = () => {
  const navigate = useNavigate();

  // ==============================
  // 🧠 STATE
  // ==============================
  const [search, setSearch] = useState<string>("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "collection">("delivery");
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);

  // ==============================
  // 🍔 FETCH MENU
  // ==============================
  const fetchMenu = async (): Promise<void> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu`);
      const data = await res.json();

      const cleanData: MenuItem[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        image: item.image
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
  const addToCart = (item: MenuItem): void => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const removeFromCart = (index: number): void => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  // ==============================
  // 💳 PAY (MULTI-ORDER + VALIDATION)
  // ==============================
  const handlePlaceOrder = async (): Promise<void> => {
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

    if (!agreeTerms) {
      alert("You must agree to Terms & Conditions");
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

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid server response");
      }

      if (!res.ok || !data.checkoutUrl) {
        alert(data?.error || "Payment failed");
        setLoading(false);
        return;
      }

      // ==============================
      // ✅ SAVE MULTIPLE ORDERS
      // ==============================
      const orderNumber = data.orderNumber || data.order?.order_number;

      if (orderNumber) {
        const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]");

        existingOrders.unshift(orderNumber);

        const limitedOrders = existingOrders.slice(0, 10);

        localStorage.setItem("orders", JSON.stringify(limitedOrders));

        // latest quick access
        localStorage.setItem("orderNumber", orderNumber);
      }

      if (data.order?.id) {
        localStorage.setItem("orderId", data.order.id.toString());
      }

      setCart([]);

      setTimeout(() => {
        window.location.href = data.checkoutUrl;
      }, 300);

    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed");
      setLoading(false);
    }
  };

  // ==============================
  // ✅ TRACK BUTTON
  // ==============================
  const handleTrackOrder = () => {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");

    if (orders.length === 0) {
      alert("No orders found. Please place an order first.");
      return;
    }

    navigate("/track");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* HEADER */}
      <header className="py-16 px-4 text-center bg-white border-b shadow-sm mb-10 relative">
        <h1 className="text-4xl font-black">
          Blue <span className="text-blue-600">Plate</span> Special
        </h1>

        <button
          onClick={handleTrackOrder}
          className="absolute top-6 left-6 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Track Order
        </button>

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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
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

          {/* DELIVERY / COLLECTION */}
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

          {/* ADDRESS */}
          {deliveryType === "delivery" && (
            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full mt-4 p-3 border"
            />
          )}

          {/* PHONE */}
          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full mt-4 p-3 border"
          />

          {/* TERMS */}
          <div className="mt-6 border p-4 rounded-lg bg-gray-50">
            <h3 className="font-bold mb-2">Terms & Conditions</h3>
            <ul className="text-sm list-disc ml-5 space-y-1">
              <li>No refunds once payment is completed.</li>
              <li>Please ensure your order details are correct before paying.</li>
              <li>Delivery times may vary depending on demand.</li>
              <li>Collection orders must be picked up within 30 minutes.</li>
            </ul>

            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
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