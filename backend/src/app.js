const express = require("express");
const cors = require("cors");


const aiRoutes = require("./routes/aiRoutes");
const demoRoutes = require("./routes/demoRoutes");
const evaluationRoutes = require("./routes/evaluationRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const toolActionRoutes = require("./routes/toolActionRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://trustdesk-capstone-airtribe.vercel.app",
    ],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "TrustDesk API Running" });
});

app.use("/tickets", ticketRoutes);
app.use("/knowledge", knowledgeRoutes);
app.use("/tickets", aiRoutes);
app.use(toolActionRoutes);
app.use("/evaluation", evaluationRoutes);
app.use("/demo", demoRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
