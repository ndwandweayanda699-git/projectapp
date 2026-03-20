require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require("jsonwebtoken");

const app = express();

// ==============================
// 🔐 CONFIG
// ==============================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "sizakala123";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ==============================
// 🚨 MIDDLEWARE
// ==============================

// 🔥 RAW body for Yoco ONLY
app.use('/webhook/yoco', express.raw({ type: '*/*' }));

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ==============================
// 🔐 AUTH
// ==============================

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

// ==============================
// 🔐 LOGIN
// ==============================

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
  res.json({ token });
});

// ==============================
// 🗄️ DATABASE
// ==============================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==============================
// 🟢 CREATE ORDER
// ==============================

app.post('/api/orders', async (req, res) => {

  const {
    user_id,
    item_ordered,
    price,
    payment_method,
    address,
    phone,
    delivery_type
  } = req.body;

  if (!user_id || !item_ordered || !price || !payment_method || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (delivery_type === "delivery" && !address) {
    return res.status(400).json({ error: "Address required" });
  }

  const finalAddress =
    delivery_type === "collection" ? "COLLECTION" : address || "COLLECTION";

  const finalDeliveryType = delivery_type || "collection";

  try {
    const result = await pool.query(
      `INSERT INTO orders
      (user_id, item_ordered, price, payment_method, payment_status, address, phone, delivery_status, delivery_type, created_at)
      VALUES ($1,$2,$3,$4,'pending',$5,$6,'pending',$7,NOW())
      RETURNING *`,
      [
        user_id,
        item_ordered,
        price,
        payment_method,
        finalAddress,
        phone,
        finalDeliveryType
      ]
    );

    res.json({ order: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Create failed" });
  }
});

// ==============================
// 💳 YOCO WEBHOOK
// ==============================

app.post('/webhook/yoco', async (req, res) => {

  try {

    const event = JSON.parse(req.body.toString());

    console.log("🔥 Webhook:", event.type);

    if (event.type === "payment.succeeded") {

      const orderId = event.metadata?.order_id;

      if (!orderId) return res.sendStatus(200);

      await pool.query(
        `UPDATE orders
         SET payment_status='paid'
         WHERE id=$1 AND payment_status='pending'`,
        [orderId]
      );

      console.log("✅ Payment updated:", orderId);
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.sendStatus(500);
  }
});

// ==============================
// 🔐 GET ACTIVE ORDERS
// ==============================

app.get('/api/orders', verifyAdmin, async (req, res) => {

  const result = await pool.query(
    `SELECT * FROM orders ORDER BY id DESC`
  );

  res.json(result.rows);
});

// ==============================
// 🔐 UPDATE DELIVERY
// ==============================

app.post('/api/update-delivery', verifyAdmin, async (req, res) => {

  const { order_id, status } = req.body;

  const result = await pool.query(
    `UPDATE orders
     SET delivery_status=$1
     WHERE id=$2
     RETURNING *`,
    [status, order_id]
  );

  res.json(result.rows[0]);
});

// ==============================
// 🔐 DELETE ORDER
// ==============================

app.delete('/api/orders/:id', verifyAdmin, async (req, res) => {

  const { id } = req.params;

  await pool.query(`DELETE FROM orders WHERE id=$1`, [id]);

  res.json({ message: "Deleted" });
});

// ==============================
// 📦 ARCHIVE SYSTEM (SAFE)
// ==============================

const archiveOldOrders = async () => {
  try {
    console.log("🕒 Running archive job...");

    // ONLY move orders not already archived
    await pool.query(`
      INSERT INTO orders_archive
      SELECT * FROM orders
      WHERE created_at < NOW() - INTERVAL '24 hours'
      AND id NOT IN (SELECT id FROM orders_archive)
    `);

    await pool.query(`
      DELETE FROM orders
      WHERE created_at < NOW() - INTERVAL '24 hours'
    `);

    console.log("✅ Archive complete");

  } catch (err) {
    console.error("❌ Archive error:", err);
  }
};

// run every hour
setInterval(archiveOldOrders, 60 * 60 * 1000);

// ==============================
// ❤️ HEALTH
// ==============================

app.get('/', (req, res) => {
  res.send("🚀 API running");
});

// ==============================
// 🚀 START
// ==============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Running on ${PORT}`);
});