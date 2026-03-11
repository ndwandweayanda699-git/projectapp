require('dotenv').config();
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

// Database connection (Neon)
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


// SAVE ORDER
app.post('/api/orders', async (req, res) => {

  const { user_id, item_ordered, price, payment_method } = req.body;

  try {

    const result = await pool.query(
      'INSERT INTO orders (user_id, item_ordered, price, payment_method) VALUES ($1,$2,$3,$4) RETURNING *',
      [user_id, item_ordered, price, payment_method]
    );

    res.status(201).json({
      message: "Order saved successfully",
      order: result.rows[0]
    });

  } catch (err) {

    console.error("Database error:", err);

    res.status(500).json({
      error: "Failed to save order"
    });

  }

});


// FETCH ALL ORDERS
app.get('/api/orders', async (req, res) => {

  try {

    const result = await pool.query(
      'SELECT * FROM orders ORDER BY id DESC'
    );

    res.json(result.rows);

  } catch (err) {

    console.error("Error fetching orders:", err);

    res.status(500).json({
      error: "Failed to fetch orders"
    });

  }

});


// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});