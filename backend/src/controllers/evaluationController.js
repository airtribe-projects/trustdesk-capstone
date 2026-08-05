const evaluationService = require("../services/evaluationService");

async function getEvaluationSummary(req, res, next) {
  try {
    const summary = await evaluationService.getEvaluationSummary();
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEvaluationSummary,
};
