process.env.API_SECRET_KEY = "test-key";
const { test } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../app");

test("health endpoint returns ok", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("products endpoint returns a list", async () => {
  const res = await request(app).get("/api/products");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body) && res.body.length > 0);
});

test("cart validation rejects a missing API key", async () => {
  const res = await request(app).post("/api/cart/validate").send({ items: [] });
  assert.equal(res.status, 401);
});

test("cart validation accepts a valid API key", async () => {
  const res = await request(app)
    .post("/api/cart/validate")
    .set("x-api-key", "test-key")
    .send({ items: [{ id: 1, quantity: 1 }] });
  assert.equal(res.status, 200);
  assert.ok(res.body.total > 0);
});
