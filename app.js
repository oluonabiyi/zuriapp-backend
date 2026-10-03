require("dotenv").config();
const express = require("express");
const cors = require("cors");
const client = require("prom-client");
const products = require("./data/products");

const app = express();
const API_SECRET_KEY = process.env.API_SECRET_KEY;
const STORE_NAME = process.env.STORE_NAME || "My Store";

app.use(cors());
app.use(express.json());

// ---- Metrics for Prometheus ----
client.collectDefaultMetrics();
const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});
const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on("finish", () => {
    const route = req.route ? req.baseUrl + req.route.path : "unmatched";
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequests.inc(labels);
    end(labels);
  });
  next();
});

const validateApiKey = (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key || key !== API_SECRET_KEY) {
    return res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
  }
  next();
};

// ---- Platform endpoints ----
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// ---- Original application routes (unchanged) ----
app.get("/api/store", (req, res) => {
  res.json({ name: STORE_NAME, totalProducts: products.length });
});

app.get("/api/products", (req, res) => {
  const { category } = req.query;
  const result = category ? products.filter((p) => p.category === category) : products;
  res.json(result);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

app.post("/api/cart/validate", validateApiKey, (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid cart payload" });
  }
  const validated = items.map((item) => {
    const product = products.find((p) => p.id === item.id);
    if (!product) return { id: item.id, valid: false, reason: "Product not found" };
    if (product.stock < item.quantity)
      return { id: item.id, valid: false, reason: "Insufficient stock" };
    return {
      id: item.id,
      valid: true,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });
  const total = validated.filter((i) => i.valid).reduce((sum, i) => sum + i.subtotal, 0);
  res.json({ items: validated, total });
});

module.exports = app;
