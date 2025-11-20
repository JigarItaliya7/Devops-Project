// payment-service/index.js
const express = require("express");
const jwt = require("jsonwebtoken"); // outdated version on purpose

const app = express();

app.get("/payments", (req, res) => {
  res.json([
    { id: 1, user_id: 1, amount: 100, status: "PAID" },
    { id: 2, user_id: 2, amount: 50, status: "PENDING" }
  ]);
});

app.get("/", (req, res) => {
  res.send("Payment Service (insecure jsonwebtoken version)");
});

app.listen(3003, () => console.log("Payment service running on port 3003"));
