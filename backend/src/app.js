const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({ message: "TrustDesk API Running" });
});

module.exports = app;
