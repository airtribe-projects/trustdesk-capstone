const express = require("express");

const demoController = require("../controllers/demoController");

const router = express.Router();

router.post("/reset", demoController.resetOperationalState);

module.exports = router;
