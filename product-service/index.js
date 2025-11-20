// product-service/index.js
const express = require("express");
const moment = require("moment");

const app = express();

app.get("/products", (req, res) => {
  const products = [
    { id: 1, name: "Laptop" },
    { id: 2, name: "Keyboard" }
  ];
  res.json({
    products,
    generatedAt: moment().format()
  });
});

app.get("/", (req, res) => {
  res.send("Product Service (vulnerable moment)");
});

app.listen(3001, () => console.log("Product service running on port 3001"));
