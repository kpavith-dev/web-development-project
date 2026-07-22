import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

console.log("==================================");
console.log("MongoDB Connection Test");
console.log("==================================");

console.log("MONGO_URI:");
console.log(process.env.MONGO_URI);
console.log("");

try {
  console.log("Connecting to MongoDB...");

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("✅ MongoDB Connected Successfully!");

  console.log("Database Name:", mongoose.connection.name);
  console.log("Host:", mongoose.connection.host);

  await mongoose.disconnect();

  console.log("✅ Connection Closed");
} catch (err) {
  console.log("");
  console.log("❌ MongoDB Connection Failed");
  console.log("");
  console.log("Error Name :", err.name);
  console.log("Error Code :", err.code);
  console.log("Error Message:");
  console.log(err.message);

  console.log("");
  console.log("Full Error:");
  console.error(err);
}
