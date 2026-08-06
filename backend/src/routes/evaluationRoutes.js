const express = require("express");

const evaluationController = require("../controllers/evaluationController");

const router = express.Router();

router.get("/", evaluationController.getEvaluationSummary);

module.exports = router;
