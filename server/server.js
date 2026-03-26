require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require("jsonwebtoken");
const path = require('path');

const app = express();

// ==============================
// 🔐 CONFIG
// ==============================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "sizakala123";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// ==============================
// 🚨 MIDDLEWARE
// ==============================

app.use('/webhook/yoco', express.raw({ type: '*/*' }));
app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

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
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
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
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "4h" });
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
// 🟢 CUSTOMER ORDER
// ==============================
app.post('/api/orders', async (req, res) => {
  const { user_id, item_ordered, price, payment_method, address, phone, delivery_type } = req.body;

  if (!user_id || !item_ordered || !price || !payment_method || !phone) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const finalAddress = delivery_type === "collection" ? "COLLECTION" : address || "COLLECTION";
  const finalDeliveryType = delivery_type || "collection";

  try {
    const result = await pool.query(
      `INSERT INTO orders
      (user_id, item_ordered, price, payment_method, payment_status, address, phone, delivery_status, delivery_type, created_at)
      VALUES ($1,$2,$3,$4,'pending',$5,$6,'pending',$7,NOW())
      RETURNING *`,
      [user_id, item_ordered, price, payment_method, finalAddress, phone, finalDeliveryType]
    );

    res.json({ order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Create failed" });
  }
});

// ==============================
// 🍳 KITCHEN ACCESS (NO AUTH)
// ==============================

// 🔥 Kitchen fetch orders (NO verifyAdmin)
app.get('/api/kitchen/orders', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM orders
       WHERE delivery_status != 'ready'
       ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Kitchen fetch failed" });
  }
});

// 🔥 Kitchen updates order status
app.put('/api/kitchen/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE orders SET delivery_status=$1 WHERE id=$2 RETURNING *`,
      [status, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Kitchen update failed" });
  }
});

// ==============================
// 🔐 ADMIN ROUTES
// ==============================

app.get('/api/orders', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM orders ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

app.post('/api/update-delivery', verifyAdmin, async (req, res) => {
  const { order_id, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE orders SET delivery_status=$1 WHERE id=$2 RETURNING *`,
      [status, order_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.post('/api/archive-order', verifyAdmin, async (req, res) => {
  const { order_id } = req.body;
  try {
    await pool.query(`INSERT INTO orders_archive SELECT * FROM orders WHERE id = $1 ON CONFLICT (id) DO NOTHING`, [order_id]);
    await pool.query(`DELETE FROM orders WHERE id = $1`, [order_id]);
    res.json({ message: "Archived" });
  } catch (err) {
    res.status(500).json({ error: "Archive failed" });
  }
});

app.delete('/api/orders/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM orders WHERE id=$1`, [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
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
// 🚀 START
// ==============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Running on ${PORT}`));