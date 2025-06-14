// src/lib/mongodb/connect.ts
import mongoose from "mongoose";
import { MONGODB_URI } from "@/config/dbConfig";


let isConnected = false;

console.log(MONGODB_URI);


export async function connectToDatabase() {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "cse299",
    });
    isConnected = true;
    console.log("✅ Connected to MongoDB");
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