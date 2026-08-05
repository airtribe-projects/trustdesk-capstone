const demoService = require("../services/demoService");

async function resetOperationalState(req, res, next) {
  try {
    const result = await demoService.resetOperationalState();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  resetOperationalState,
};
