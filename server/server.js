require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) return console.error('DB Connection Error:', err.stack);
  console.log('Connected to Neon PostgreSQL');
  release();
});


// PAYMENT + ORDER ROUTE
app.post('/api/orders', async (req, res) => {

  const { user_id, item_ordered, price, payment_method, token } = req.body;

  try {

    // 1️⃣ Charge card using Yoco
    const yocoResponse = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "X-Auth-Secret-Key": process.env.YOCO_SECRET_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: token,
        amountInCents: price * 100,
        currency: "ZAR"
      })
    });

    const paymentData = await yocoResponse.json();

    if (!yocoResponse.ok) {
      console.error("Payment failed:", paymentData);
      return res.status(400).json({
        error: "Payment failed",
        details: paymentData
      });
    }

    console.log("Payment successful");

    // 2️⃣ Save order after payment
    const result = await pool.query(
      'INSERT INTO orders (user_id, item_ordered, price, payment_method) VALUES ($1,$2,$3,$4) RETURNING id',
      [user_id, item_ordered, price, payment_method]
    );

    const newOrderId = result.rows[0].id;

    res.status(201).json({
      message: "Payment successful and order saved!",
      order: { id: newOrderId }
    });

  } catch (err) {

    console.error("Server error:", err);

    res.status(500).json({
      error: "Server failed to process payment"
    });

  }

});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
