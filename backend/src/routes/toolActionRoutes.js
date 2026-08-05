const express = require("express");

const toolActionController = require("../controllers/toolActionController");

const router = express.Router();

router.get("/tickets/:ticketId/tool-actions", toolActionController.listTicketActions);
router.post("/tickets/:ticketId/tool-actions/replacement", toolActionController.requestReplacement);
router.post("/tool-actions/:actionId/decision", toolActionController.decideAction);
router.post("/tool-actions/:actionId/execute", toolActionController.executeAction);

module.exports = router;
