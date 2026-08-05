const toolActionService = require("../services/toolActionService");

async function listTicketActions(req, res, next) {
  try {
    const actions = await toolActionService.listTicketActions(req.params.ticketId);
    res.status(200).json(actions);
  } catch (error) {
    next(error);
  }
}

async function requestReplacement(req, res, next) {
  try {
    const result = await toolActionService.requestReplacement(req.params.ticketId, req.body);
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
}

async function decideAction(req, res, next) {
  try {
    const action = await toolActionService.decideAction(req.params.actionId, req.body);
    res.status(200).json(action);
  } catch (error) {
    next(error);
  }
}

async function executeAction(req, res, next) {
  try {
    const action = await toolActionService.executeAction(req.params.actionId);
    res.status(200).json(action);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  decideAction,
  executeAction,
  listTicketActions,
  requestReplacement,
};
