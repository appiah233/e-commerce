require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cluster = require("cluster");
const os = require("os");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Connection to MongoDB
connectDB();

const runServer = () => {
  const app = express();

  app.disable("x-powered-by");
  app.enable("trust proxy");

  app.use(helmet());
  if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
  }

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "15kb" }));
  app.use(express.urlencoded({ extended: true, limit: "15kb" }));
  app.use(compression());

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1500, // Limit each IP to 1500 requests per 15 minutes
    message: {
      status: "error",
      message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api", apiLimiter);

  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "success", message: "API is running..." });
  });

  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/products", require("./routes/productRoutes"));
  app.use("/api/orders", require("./routes/orderRoutes"));
  app.use("/api/payment", require("./routes/paymentRoutes"));

  const publicDir = __dirname;
  app.use(
    express.static(publicDir, {
      maxAge: "1d",
      etag: true,
    })
  );

  app.get("*", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.use(notFound);
  app.use(errorHandler);

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(
      `Worker ${process.pid} running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
    );
  });
};

if (cluster.isMaster && process.env.NODE_ENV === "production") {
  const numCPUs = os.cpus().length;
  console.log(`Master cluster manager ${process.pid} is starting...`);
  console.log(`Spawning ${numCPUs} worker processes to handle high concurrency...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Spawning replacement...`);
    cluster.fork();
  });
} else {
  runServer();
}
