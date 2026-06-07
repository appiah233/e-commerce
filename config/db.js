const dns = require("dns");
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/emyafrobeads";

    dns.setServers(["1.1.1.1", "8.8.8.8"]);
    console.log("Using DNS servers:", dns.getServers());
    console.log("Attempting to connect to MongoDB...");
    console.log(`URI: ${uri.substring(0, 50)}...`);

    // Mongoose connection with pooling configured for high concurrency (e.g., 50,000+ users)
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 500, // Handle up to 500 connections in the pool
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.error(`Full error: ${error}`);
    process.exit(1);
  }
};

module.exports = connectDB;
