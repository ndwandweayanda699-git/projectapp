require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// ==============================
// MIDDLEWARE
// ==============================

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ==============================
// DATABASE CONNECTION (Neon)
// ==============================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ DB Connection Error:', err.stack);
  } else {
    console.log('✅ Connected to Neon PostgreSQL');
    release();
  }
});

// ==============================
// CREATE ORDER (WITH DELIVERY)
// ==============================

app.post('/api/orders', async (req, res) => {

  const { user_id, item_ordered, price, payment_method, address } = req.body;

  // 🔒 Basic validation
  if (!user_id || !item_ordered || !price || !payment_method || !address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {

    const result = await pool.query(
      `INSERT INTO orders
      (user_id, item_ordered, price, payment_method, payment_status, address, delivery_status)
      VALUES ($1,$2,$3,$4,'pending',$5,'pending')
      RETURNING *`,
      [user_id, item_ordered, price, payment_method, address]
    );

    res.status(201).json({
      message: "Order created (awaiting payment)",
      order: result.rows[0]
    });

  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ==============================
// YOCO WEBHOOK (PAYMENT SUCCESS)
// ==============================

app.post('/webhook/yoco', async (req, res) => {

  try {

    const event = req.body;

    console.log("🔥 Webhook received:", event.type);

    if (event.type === "payment.succeeded") {

      const orderId = event.metadata?.order_id;

      if (!orderId) {
        console.log("⚠️ No order_id in metadata");
        return res.sendStatus(200);
      }

      // ✅ Prevent double updates
      const result = await pool.query(
        `UPDATE orders
         SET payment_status = 'paid'
         WHERE id = $1
         AND payment_status = 'pending'
         RETURNING *`,
        [orderId]
      );

      if (result.rows.length > 0) {
        console.log("✅ Order marked as PAID:", result.rows[0].id);
      } else {
        console.log("⚠️ Order already updated or not found");
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.sendStatus(500);
  }

});

// ==============================
// FETCH ALL ORDERS (MANAGER)
// ==============================

app.get('/api/orders', async (req, res) => {

  try {

    const result = await pool.query(
      `SELECT * FROM orders ORDER BY id DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error("❌ Fetch orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }

});

// ==============================
// FETCH ONLY PAID ORDERS
// ==============================

app.get('/api/orders/paid', async (req, res) => {

  try {

    const result = await pool.query(
      `SELECT * FROM orders
       WHERE payment_status = 'paid'
       ORDER BY id DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error("❌ Fetch paid orders error:", err);
    res.status(500).json({ error: "Failed to fetch paid orders" });
  }

});

// ==============================
// UPDATE DELIVERY STATUS 🚚
// ==============================

app.post('/api/update-delivery', async (req, res) => {

  const { order_id, status } = req.body;

  if (!order_id || !status) {
    return res.status(400).json({ error: "Missing order_id or status" });
  }

  try {

    const result = await pool.query(
      `UPDATE orders
       SET delivery_status = $1
       WHERE id = $2
       RETURNING *`,
      [status, order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      message: "Delivery status updated",
      order: result.rows[0]
    });

  } catch (err) {
    console.error("❌ Delivery update error:", err);
    res.status(500).json({ error: "Failed to update delivery status" });
  }

});

// ==============================
// HEALTH CHECK (VERY USEFUL)
// ==============================

app.get('/', (req, res) => {
  res.send("🚀 API is running");
});

// ==============================
// SERVER START
// ==============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});