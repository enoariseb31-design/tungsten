const http = require("http");
require("dotenv").config();

const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0"; // Required for cloud

const server = http.createServer((req, res) => {
  // Basic CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  // Main endpoint
  if (req.url === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "ChatFlow API",
        status: "running",
        port: PORT,
      }),
    );
    return;
  }

  // 404 for other routes
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

// Error handling
server.on("error", (error) => {
  console.error("Server error:", error);
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} already in use`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down");
  server.close(() => process.exit(0));
});

server.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}/`);
  console.log(`🌐 Access: http://localhost:${PORT}`);
  console.log(`⚡ Health: http://localhost:${PORT}/health`);
});
