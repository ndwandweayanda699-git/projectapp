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

// 🚨 FAIL FAST IF MISSING
if (!YOCO_WEBHOOK_SECRET) {
  console.error("❌ Missing YOCO_WEBHOOK_SECRET");
  process.exit(1);
}

// ==============================
// 🚨 MIDDLEWARE
// ==============================

// 🔥 RAW BODY FOR WEBHOOK (Must stay above express.json)
app.use('/webhook/yoco', express.raw({ type: '*/*' }));

app.use(express.json());

app.use(cors({
  origin: "*",
}));

// 🔍 DEBUG LOGS
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ==============================
// 🗄️ DATABASE
// ==============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==============================
// 🔐 AUTH MIDDLEWARE
// ==============================

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Not admin" });
    }
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
    if (decoded.role !== "kitchen") {
      return res.status(403).json({ error: "Not kitchen" });
    }
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

// ==============================
// 🔐 LOGIN ROUTES
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
// 🟢 CREATE ORDER (UNPAID)
// ==============================

app.post('/api/orders', async (req, res) => {
  const { user_id, item_ordered, price, payment_method } = req.body;

  if (!user_id || !item_ordered || !price) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders
      (user_id, item_ordered, price, payment_method, payment_status, delivery_status, created_at)
      VALUES ($1,$2,$3,$4,'pending','pending',NOW())
      RETURNING *`,
      [user_id, item_ordered, price, payment_method]
    );

    console.log("🧾 Order created (Pending Payment):", result.rows[0].id);
    res.json({ order: result.rows[0] });

  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ error: "Create failed" });
  }
});

// ==============================
// 💳 YOCO WEBHOOK
// ==============================

app.post('/webhook/yoco', async (req, res) => {
  try {
    const signature = req.headers['yoco-signature'];
    if (!signature) return res.sendStatus(400);

    // ✅ VERIFY SIGNATURE
    const expectedSignature = crypto
      .createHmac('sha256', YOCO_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.log("❌ Invalid Webhook Signature");
      return res.sendStatus(400);
    }

    const event = JSON.parse(req.body.toString());

    // ==============================
    // ✅ PAYMENT SUCCESS
    // ==============================
    if (event.type === "payment.succeeded") {
      const orderId = event.data?.metadata?.order_id;

      if (orderId) {
        await pool.query(
          `UPDATE orders
           SET payment_status='paid'
           WHERE id=$1 AND payment_status!='paid'`,
          [orderId]
        );
        console.log(`✅ Order ${orderId} marked PAID via Webhook`);
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("🔥 Webhook error:", err);
    res.sendStatus(500);
  }
});

// ==============================
// 🍳 KITCHEN (ONLY PAID & ACTIVE)
// ==============================

app.get('/api/kitchen/orders', verifyKitchen, async (req, res) => {
  try {
    // Only show paid orders that aren't "ready" yet
    const result = await pool.query(
      `SELECT * FROM orders
       WHERE payment_status='paid'
       AND delivery_status != 'ready'
       ORDER BY id ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Kitchen fetch error:", err);
    res.status(500).json({ error: "Kitchen fetch failed" });
  }
});

// Update status route for kitchen Start/Done buttons
app.put('/api/kitchen/orders/:id', verifyKitchen, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'preparing' or 'ready'

  try {
    await pool.query(
      `UPDATE orders SET delivery_status=$1 WHERE id=$2`,
      [status, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// ==============================
// 👨‍💼 ADMIN (ONLY PAID HISTORY)
// ==============================

app.get('/api/orders', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM orders
       WHERE payment_status='paid'
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Admin fetch error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ==============================
// 📦 FRONTEND
// ==============================

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==============================
// 🚀 START SERVER
// ==============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

