import React, { useState } from 'react';
import { MENU_ITEMS } from './lib/datasource';
import Input from './components/ui/input';

const App: React.FC = () => {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  // 1. Set Yoco as the only state
  const [paymentMethod] = useState('Yoco');

  const filteredItems = MENU_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: any) => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const removeFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  // --- YOCO PAYMENT FUNCTION ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return alert("Your cart is empty!");

    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

    // Initialize Yoco
    // @ts-ignore
    const yoco = new window.YocoSDK({
      publicKey: 'pk_test_d902844fJv1Plklc8a74'
    });

    // Open Yoco Popup
    yoco.showPopup({
      amountInCents: totalAmount * 100,
      currency: 'ZAR',
      name: 'Blue Plate Special',
      description: 'Order Payment',
      callback: async (result: any) => {
        if (result.error) {
          alert("Payment failed: " + result.error.message);
        } else {
          // Save to Database only if payment succeeds
          try {
            const response = await fetch('https://sizakala.onrender.com', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: 1,
                item_ordered: cart.map(i => i.name).join(", "),
                price: totalAmount,
                payment_method: 'Yoco'
              }),
            });

            if (response.ok) {
              const data = await response.json();
              alert("Payment successful! Order ID: " + data.order.id);
              setCart([]);
            }
          } catch (err) {
            alert("Payment worked, but database failed. Check your server!");
          }
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="py-16 px-4 text-center bg-white border-b border-slate-100 shadow-sm mb-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
          Blue <span className="text-blue-600">Plate</span> Special
        </h1>
        <p className="mt-4 text-slate-500 text-lg max-w-md mx-auto">
          Premium dining, delivered with precision.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex justify-center mb-10">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for food or drinks..."
          />
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <div key={item.id} className="group bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <div className="relative h-64 overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-1 rounded-full font-bold shadow-lg">
                  R{item.price}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{item.name}</h3>
                <button
                  onClick={() => addToCart(item)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Section */}
        <div className="mt-16 bg-white p-6 rounded-2xl shadow-md border border-slate-200 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">🛒 Your Cart</h2>

          {cart.length === 0 ? (
            <p className="text-slate-500 text-center py-10">Your cart is empty.</p>
          ) : (
            <>
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center border-b py-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-slate-500">R{item.price}</p>
                  </div>
                  <button onClick={() => removeFromCart(index)} className="bg-red-500 text-white px-3 py-1 rounded-lg">
                    Remove
                  </button>
                </div>
              ))}

              <div className="mt-6 flex justify-between items-center font-bold text-xl px-2">
                <span>Total:</span>
                <span>R{cart.reduce((total, item) => total + item.price, 0)}</span>
              </div>

              {/* UPDATED PAYMENT BUTTON AREA */}
              <div className="mt-8 border-t pt-6">
                <div className="flex items-center gap-3 mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-xl">💳</span>
                  <p className="text-sm font-bold text-blue-800">
                    Secure Payment via Yoco (Card/EFT)
                  </p>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest"
                >
                  Pay R{cart.reduce((total, item) => total + item.price, 0)} & Place Order
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

