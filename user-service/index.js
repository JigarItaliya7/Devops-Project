// user-service/index.js
const express = require("express");
const _ = require("lodash"); // vulnerable version on purpose

const app = express();

app.get("/users", (req, res) => {
  const users = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" }
  ];
  res.json(_.shuffle(users));  // just to use lodash
});

app.get("/", (req, res) => {
  res.send("User Service (vulnerable lodash)");
});

app.listen(3000, () => console.log("User service running on port 3000"));
