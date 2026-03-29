require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require("jsonwebtoken");
const path = require('path');
const crypto = require("crypto");

const app = express();

// ==============================
// 🔐 CONFIG
// ==============================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD || "kitchen123";
const JWT_SECRET = process.env.JWT_SECRET;
const YOCO_WEBHOOK_SECRET = process.env.YOCO_WEBHOOK_SECRET;
const YOCO_SECRET_KEY = process.env.YOCO_SECRET_KEY;

if (!YOCO_WEBHOOK_SECRET) {
  console.error("❌ Missing YOCO_WEBHOOK_SECRET");
  process.exit(1);
}

// ==============================
// 🚨 MIDDLEWARE
// ==============================
app.use('/webhook/yoco', express.raw({ type: '*/*' }));
app.use(express.json());
app.use(cors({ origin: "*" }));

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ==============================
// 🖼️ SERVE IMAGES
// ==============================
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// ==============================
// 🗄️ DATABASE
// ==============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==============================
// 🔐 AUTH
// ==============================
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Not admin" });
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

const verifyKitchen = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "kitchen") return res.status(403).json({ error: "Not kitchen" });
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

// ==============================
// 🔐 LOGIN
// ==============================
app.post("/api/admin/login", (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "4h" });
  res.json({ token });
});

app.post("/api/kitchen/login", (req, res) => {
  if (req.body.password !== KITCHEN_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = jwt.sign({ role: "kitchen" }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });
});

// ==============================
// 🍔 MENU
// ==============================
app.get('/api/menu', async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM menu_items WHERE is_available = TRUE ORDER BY id ASC"
  );
  res.json(result.rows);
});

app.get('/api/admin/menu', verifyAdmin, async (req, res) => {
  const result = await pool.query("SELECT * FROM menu_items ORDER BY id ASC");
  res.json(result.rows);
});

app.put('/api/admin/menu/:id/toggle', verifyAdmin, async (req, res) => {
  await pool.query(
    "UPDATE menu_items SET is_available = NOT is_available WHERE id = $1",
    [req.params.id]
  );
  res.json({ success: true });
});

// ==============================
// 💳 CREATE YOCO PAYMENT
// ==============================
app.post('/api/pay', async (req, res) => {
  try {
    const { user_id, item_ordered, price } = req.body;

    const result = await pool.query(
      `INSERT INTO orders
      (user_id, item_ordered, price, payment_method, payment_status, delivery_status, created_at)
      VALUES ($1,$2,$3,'yoco','pending','pending',NOW())
      RETURNING *`,
      [user_id, item_ordered, price]
    );

    const order = result.rows[0];

    const response = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${YOCO_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Math.round(price * 100),
        currency: "ZAR",
        metadata: {
          order_id: order.id
        },
        successUrl: `https://projectapp-sk4p.onrender.com/success?order_id=${order.id}`,
        cancelUrl: `https://projectapp-sk4p.onrender.com/success?order_id=${order.id}`
      })
    });

    const data = await response.json();

    if (!data.redirectUrl) {
      return res.status(500).json({ error: "Yoco failed" });
    }

    res.json({
      order,
      checkoutUrl: data.redirectUrl
    });

  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ error: "Payment failed" });
  }
});

// ==============================
// 📦 FETCH ORDERS
// ==============================
app.get('/api/orders', verifyAdmin, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM orders ORDER BY id DESC"
  );
  res.json(result.rows);
});

// ==============================
// ❌ DELETE ORDER (🔥 NEW)
// ==============================
app.delete('/api/orders/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM orders WHERE id = $1",
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// ==============================
// 💳 YOCO WEBHOOK
// ==============================
app.post('/webhook/yoco', async (req, res) => {
  try {
    const signature = req.headers['yoco-signature'];

    const expectedSignature = crypto
      .createHmac('sha256', YOCO_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.log("❌ Invalid webhook signature");
      return res.sendStatus(400);
    }

    const event = JSON.parse(req.body.toString());

    if (event.type === "payment.succeeded") {
      const orderId = event.data?.metadata?.order_id;

      await pool.query(
        `UPDATE orders SET payment_status='paid' WHERE id=$1`,
        [orderId]
      );

      console.log(`✅ Order ${orderId} PAID`);
    }

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// ==============================
// 🍳 KITCHEN
// ==============================
app.get('/api/kitchen/orders', verifyKitchen, async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM orders
     WHERE payment_status='paid'
     ORDER BY id ASC`
  );
  res.json(result.rows);
});

// ==============================
// 📦 FRONTEND
// ==============================
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==============================
// 🚀 START
// ==============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});