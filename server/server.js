
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// 2. INITIALIZE APP (This MUST happen before app.use)
const app = express();

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json());

// This logger will show you if React is actually hitting the server
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

// 4. DATABASE CONNECTION
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) return console.error('DB Connection Error:', err.stack);
  console.log('Connected to Neon PostgreSQL');
  release();
});

// 5. SAMPLE ROUTE (To test if 404 goes away)
// --- REMOVE YOUR OLD app.post('/api/orders') BLOCK AND REPLACE WITH THIS ---

// --- REPLACE YOUR OLD POST ROUTE WITH THIS ---
app.post('/api/orders', async (req, res) => {
  // 1. Added 'payment_method' to the incoming data
  const { user_id, item_ordered, price, payment_method } = req.body;

  try {
    // 2. Added 'payment_method' and '$4' to the SQL query
    const result = await pool.query(
      'INSERT INTO orders (user_id, item_ordered, price, payment_method) VALUES ($1, $2, $3, $4) RETURNING id',
      [user_id, item_ordered, price, payment_method]
    );

    const newOrderId = result.rows[0].id;

    res.status(201).json({
      message: "Order placed successfully!",
      order: { id: newOrderId }
    });

  } catch (err) {
    console.error("DB Error:", err.message);
    res.status(500).json({ error: "Database failed to save payment info" });
  }
});

// --- END OF UPDATE ---

// 6. START SERVER
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
