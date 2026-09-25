const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[db] MONGO_URI is not set in server/.env");
    process.exit(1);
  }

  mongoose.set("strictQuery", true);

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  }

  // Handle disconnections after initial connection
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected");
  });

  // Handle connection error events
  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err);
  });

  // Gracefully close connection on process termination
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("[db] MongoDB connection closed through app termination");
    process.exit(0);
  });
}

module.exports = connectDB;