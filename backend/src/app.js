const express = require("express");

const aiRoutes = require("./routes/aiRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "TrustDesk API Running" });
});

app.use("/tickets", ticketRoutes);
app.use("/knowledge", knowledgeRoutes);
app.use("/tickets", aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
