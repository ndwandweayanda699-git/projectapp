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
// 🖼️ STATIC
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

// ==============================
// 💳 CREATE PAYMENT
// ==============================
app.post('/api/pay', async (req, res) => {
  try {
    const { user_id, item_ordered, price } = req.body;

    const orderNumber = "BP" + Date.now();

    const result = await pool.query(
      `INSERT INTO orders
      (order_number, user_id, item_ordered, price, payment_method, payment_status, status, delivery_status, created_at)
      VALUES ($1,$2,$3,$4,'yoco','pending','pending','pending',NOW())
      RETURNING *`,
      [orderNumber, user_id, item_ordered, price]
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
        metadata: { order_id: order.id },
        successUrl: `https://projectapp-sk4p.onrender.com/success?order_id=${order.id}`,
        cancelUrl: `https://projectapp-sk4p.onrender.com/success?order_id=${order.id}`
      })
    });

    const data = await response.json();

    res.json({
      order,
      orderNumber,
      checkoutUrl: data.redirectUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment failed" });
  }
});

// ==============================
// 📦 TRACK ORDER
// ==============================
app.get('/api/track/:orderNumber', async (req, res) => {
  const result = await pool.query(
    "SELECT order_number, status, payment_status FROM orders WHERE order_number = $1",
    [req.params.orderNumber]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json(result.rows[0]);
});

// ==============================
// 🔥 KITCHEN UPDATE (FIXED)
// ==============================
app.put('/api/kitchen/orders/:id', verifyKitchen, async (req, res) => {
  const { status } = req.body;

  await pool.query(
    "UPDATE orders SET delivery_status=$1 WHERE id=$2",
    [status, req.params.id]
  );

  res.json({ success: true });
});

// ==============================
// 🍳 KITCHEN FETCH
// ==============================
app.get('/api/kitchen/orders', verifyKitchen, async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM orders WHERE payment_status='paid' ORDER BY id ASC`
  );
  res.json(result.rows);
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
      return res.sendStatus(400);
    }

    const event = JSON.parse(req.body.toString());

    if (event.type === "payment.succeeded") {
      const orderId = event.data?.metadata?.order_id;

      await pool.query(
        `UPDATE orders
         SET payment_status='paid', status='confirmed', delivery_status='pending'
         WHERE id=$1`,
        [orderId]
      );
    }

    res.sendStatus(200);

  } catch {
    res.sendStatus(500);
  }
});

// ==============================
// FRONTEND
// ==============================
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});