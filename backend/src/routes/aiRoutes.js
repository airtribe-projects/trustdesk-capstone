const express = require("express");

const aiController = require("../controllers/aiController");

const router = express.Router();

router.post("/:ticketId/analyze", aiController.analyzeTicket);

module.exports = router;
