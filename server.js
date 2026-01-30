// At the top of server.js, add:
const path = require("path");

// Update CORS for production
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:5500",
      "https://your-netlify-app.netlify.app",
      "https://*.netlify.app",
    ],
    credentials: true,
  }),
);

// Serve frontend from backend (optional, but good for all-in-one)
app.use(express.static(path.join(__dirname, "../frontend")));

// Add catch-all route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Update port for production
const PORT = process.env.PORT || 3001;

const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "chatbot_saas",
  port: process.env.DB_PORT || 3306,
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection error:", err);
    return;
  }
  console.log("✅ Connected to MySQL");
  createTables();
});

function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      firebase_uid VARCHAR(255) UNIQUE NOT NULL, 
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      plan ENUM('free', 'standard', 'premium') DEFAULT 'free',
      devices_count INT DEFAULT 1,
      max_devices INT DEFAULT 1,
      tokens_used_month INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS devices (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      device_id VARCHAR(255) UNIQUE NOT NULL,
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS usage_tracking (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      tokens_used INT DEFAULT 0,
      month_year VARCHAR(7),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      plan VARCHAR(50),
      amount DECIMAL(10,2),
      status VARCHAR(50),
      payment_method VARCHAR(50),
      transaction_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS vouchers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      voucher_code VARCHAR(100) UNIQUE,
      plan VARCHAR(50),
      price_usd DECIMAL(10,2),
      status ENUM('active', 'used', 'expired') DEFAULT 'active',
      user_id INT NULL,
      used_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS chat_history (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id VARCHAR(255) NOT NULL,
      user_message TEXT NOT NULL,
      bot_response TEXT NOT NULL,
      tokens_used INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id)
    )`,
  ];

  queries.forEach((query) => {
    db.query(query, (err) => {
      if (err) console.error("Table error:", err.message);
    });
  });
  console.log("✅ Tables ready");
}

// Simple in-memory "users" (for demo only)
const users = new Map();

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
console.log("✅ OpenAI initialized");

// SIMPLE LOGIN/REGISTER (same endpoint)
app.post("/api/auth", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  // Create "user" in memory
  const user = {
    id: Date.now(),
    email,
    plan: "free",
    createdAt: new Date(),
  };

  users.set(email, user);

  res.json({
    success: true,
    message: "Welcome!",
    user: {
      email,
      plan: "free",
    },
  });
});

// SIMPLE CHAT ENDPOINT
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    console.log("📨 Chat:", message.substring(0, 50));

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "You are Tungs AI, a helpful professional assistant. Be concise and helpful.",
        },
        { role: "user", content: message },
      ],
      max_tokens: 300,
    });

    const response = completion.choices[0].message.content;

    console.log("✅ Response sent");
    res.json({
      response,
      tokensUsed: completion.usage.total_tokens,
    });
  } catch (error) {
    console.error("❌ Chat error:", error.message);
    res.status(500).json({
      error: "Chat failed",
      message: error.message,
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Tungs AI",
    users: users.size,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Tungs AI Server: http://localhost:${PORT}`);
  console.log(`🔐 Simple auth: POST /api/auth {email: "your@email.com"}`);
  console.log(`💬 Chat: POST /api/chat {message: "your question"}`);
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    console.log("📨 Chat from user:", userId, "-", message.substring(0, 50));

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are Tungs AI, a helpful professional assistant.",
        },
        { role: "user", content: message },
      ],
      max_tokens: 300,
    });

    const response = completion.choices[0].message.content;

    console.log("✅ Response sent to user:", userId);
    res.json({
      response,
      tokensUsed: completion.usage.total_tokens,
    });
  } catch (error) {
    console.error("❌ Chat error:", error.message);
    res.status(500).json({
      error: "Chat failed",
      message: error.message,
    });
    // After sending response in /api/chat endpoint:
    res.json({
      response,
      tokensUsed: completion.usage.total_tokens,
    });

    // Save to history (async, don't wait)
    if (req.body.userId) {
      db.query(
        "INSERT INTO chat_history (user_id, user_message, bot_response, tokens_used) VALUES (?, ?, ?, ?)",
        [req.body.userId, message, response, completion.usage.total_tokens],
        (err) => {
          if (err) console.error("Failed to save history:", err);
        },
      );
    }
  }
});

// Save chat history
app.post("/api/chat/history", async (req, res) => {
  try {
    const { userId, userMessage, botResponse, tokensUsed } = req.body;

    if (!userId || !userMessage || !botResponse) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    db.query(
      "INSERT INTO chat_history (user_id, user_message, bot_response, tokens_used) VALUES (?, ?, ?, ?)",
      [userId, userMessage, botResponse, tokensUsed || 0],
      (err, result) => {
        if (err) {
          console.error("Save history error:", err);
          return res.status(500).json({ error: "Failed to save history" });
        }
        res.json({ success: true, id: result.insertId });
      },
    );
  } catch (error) {
    console.error("History save error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get chat history for user
app.get("/api/chat/history/:userId", (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;

  db.query(
    "SELECT id, user_message, bot_response, tokens_used, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, parseInt(limit)],
    (err, results) => {
      if (err) {
        console.error("Get history error:", err);
        return res.status(500).json({ error: "Failed to get history" });
      }
      res.json({ history: results });
    },
  );
});
