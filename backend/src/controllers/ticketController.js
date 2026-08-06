const ticketService = require("../services/ticketService");

async function listTickets(req, res, next) {
  try {
    const tickets = await ticketService.getAllTickets();
    res.status(200).json(tickets);
  } catch (error) {
    next(error);
  }
}

async function getTicket(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.ticketId);
    res.status(200).json(ticket);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTickets,
  getTicket,
};
