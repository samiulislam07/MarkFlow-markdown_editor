// src/lib/mongodb/connect.ts
import mongoose from "mongoose";
import { MONGODB_URI } from "@/config/dbConfig";

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

console.log(MONGODB_URI);

export async function connectToDatabase() {
  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  connectionPromise = (async () => {
    try {
      const options = {
        dbName: "markflow",
        bufferCommands: true, // Enable buffering to prevent timing issues
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(MONGODB_URI, options);
      isConnected = true;
      console.log("✅ Connected to MongoDB (MarkFlow)");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      isConnected = false;
      connectionPromise = null;
      throw new Error("Failed to connect to MongoDB");
    }
  })();

  return connectionPromise;
}

export function getConnectionStatus() {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('📤 MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    process.exit(1);
  }
});