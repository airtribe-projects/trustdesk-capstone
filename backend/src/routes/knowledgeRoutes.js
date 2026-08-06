const express = require("express");

const knowledgeController = require("../controllers/knowledgeController");

const router = express.Router();

router.get("/search", knowledgeController.searchKnowledgeDocuments);

module.exports = router;
