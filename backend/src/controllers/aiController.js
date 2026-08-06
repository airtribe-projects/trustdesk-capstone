const aiService = require("../services/aiService");

async function analyzeTicket(req, res, next) {
  try {
    const analysis = await aiService.analyzeTicket(req.params.ticketId);
    res.status(200).json(analysis);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeTicket,
};
