const prisma = require("../config/prisma");
const AppError = require("../utils/AppError");

const ticketInclude = {
  customer: true,
  order: true,
};

async function getAllTickets() {
  return prisma.ticket.findMany({
    include: ticketInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getTicketById(ticketId) {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketId },
    include: ticketInclude,
  });

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  return ticket;
}

module.exports = {
  getAllTickets,
  getTicketById,
};
