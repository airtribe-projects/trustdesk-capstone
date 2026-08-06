const express = require("express");

const ticketController = require("../controllers/ticketController");

const router = express.Router();

router.get("/", ticketController.listTickets);
router.get("/:ticketId", ticketController.getTicket);

module.exports = router;
