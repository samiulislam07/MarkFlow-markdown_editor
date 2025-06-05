// src/lib/mongodb/connect.ts
import mongoose from "mongoose";
import { MONGODB_URI } from "@/config/dbConfig";

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) return;

  try {
    const options = {
      dbName: "markflow",
      bufferCommands: false,
    };

    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
    console.log("✅ Connected to MongoDB (MarkFlow)");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
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