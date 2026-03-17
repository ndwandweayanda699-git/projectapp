require('dotenv').config(); // load environment variables

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

// Database connection (Neon PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('DB Connection Error:', err.stack);
  }
  console.log('Connected to Neon PostgreSQL');
  release();
});


// ==============================
// CREATE ORDER (PAYMENT PENDING)
// ==============================

app.post('/api/orders', async (req, res) => {

  const { user_id, item_ordered, price, payment_method } = req.body;

  try {

    const result = await pool.query(
      `INSERT INTO orders (user_id, item_ordered, price, payment_method, payment_status)
       VALUES ($1,$2,$3,$4,'pending')
       RETURNING *`,
      [user_id, item_ordered, price, payment_method]
    );

    res.status(201).json({
      message: "Order created (awaiting payment)",
      order: result.rows[0]
    });

  } catch (err) {

    console.error("Database error:", err);

    res.status(500).json({
      error: "Failed to create order"
    });

  }

});


// ==============================
// CONFIRM PAYMENT
// ==============================

app.post('/api/confirm-payment', async (req, res) => {

  const { order_id } = req.body;

  try {

    const result = await pool.query(
      `UPDATE orders
       SET payment_status = 'paid'
       WHERE id = $1
       AND payment_status = 'pending'
       RETURNING *`,
      [order_id]
    );

    res.json({
      message: "Payment confirmed",
      order: result.rows[0]
    });

  } catch (err) {

    console.error("Payment confirmation error:", err);

    res.status(500).json({
      error: "Payment confirmation failed"
    });

  }

});


// ==============================
// FETCH PAID ORDERS ONLY
// ==============================

app.get('/api/orders', async (req, res) => {

  try {

    const result = await pool.query(
      `SELECT * FROM orders
       WHERE payment_status = 'paid'
       ORDER BY id DESC`
    );

    res.json(result.rows);

  } catch (err) {

    console.error("Error fetching orders:", err);

    res.status(500).json({
      error: "Failed to fetch orders"
    });

  }

});


// ==============================
// SERVER START
// ==============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});