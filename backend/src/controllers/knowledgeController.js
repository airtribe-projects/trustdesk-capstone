const knowledgeService = require("../services/knowledgeService");

async function searchKnowledgeDocuments(req, res, next) {
  try {
    const searchResult = await knowledgeService.searchKnowledgeDocuments(req.query.q);
    res.status(200).json(searchResult);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchKnowledgeDocuments,
};
