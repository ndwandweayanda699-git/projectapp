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

if (!YOCO_WEBHOOK_SECRET) {
  console.error("❌ Missing YOCO_WEBHOOK_SECRET");
  process.exit(1);
}

// ==============================
// 🚨 MIDDLEWARE
// ==============================
app.use('/webhook/yoco', express.raw({ type: '*/*' }));
app.use(express.json());

app.use(cors({
  origin: "*",
}));

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ==============================
// 🖼️ SERVE IMAGES (🔥 IMPORTANT FIX)
// ==============================
app.use('/images', express.static(path.join(__dirname, '../public/images')));

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
  try {
    const result = await pool.query(
      "SELECT * FROM menu_items WHERE is_available = TRUE ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

app.get('/api/admin/menu', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM menu_items ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Admin menu error:", err);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

app.put('/api/admin/menu/:id/toggle', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      "UPDATE menu_items SET is_available = NOT is_available WHERE id = $1",
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Toggle error:", err);
    res.status(500).json({ error: "Toggle failed" });
  }
});

app.post('/api/admin/menu', verifyAdmin, async (req, res) => {
  const { name, price, image } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO menu_items (name, price, image) VALUES ($1, $2, $3) RETURNING *",
      [name, price, image]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Add item error:", err);
    res.status(500).json({ error: "Add failed" });
  }
});

// ==============================
// 🟢 CREATE ORDER
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
         SET payment_status='paid'
         WHERE id=$1 AND payment_status!='paid'`,
        [orderId]
      );
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
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
     AND delivery_status != 'ready'
     ORDER BY id ASC`
  );

  res.json(result.rows);
});

app.put('/api/kitchen/orders/:id', verifyKitchen, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await pool.query(
    `UPDATE orders SET delivery_status=$1 WHERE id=$2`,
    [status, id]
  );

  res.json({ success: true });
});

// ==============================
// 👨‍💼 ADMIN ORDERS
// ==============================
app.get('/api/orders', verifyAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM orders
     WHERE payment_status='paid'
     ORDER BY id DESC`
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