const fs = require("fs/promises");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const dataDirectory = path.resolve(__dirname, "../../data");
const knowledgeBaseDirectory = path.join(dataDirectory, "knowledge_base");

async function readJson(filename) {
  const filePath = path.join(dataDirectory, filename);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function metadataValue(content, label) {
  const line = content
    .split(/\r?\n/)
    .find((value) => value.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  if (!line) {
    throw new Error(`Knowledge document is missing '${label}:' metadata.`);
  }

  return line.split(":", 2)[1].trim();
}

function documentTitle(content, sourcePath) {
  const heading = content.split(/\r?\n/).find((line) => line.startsWith("# "));
  return heading ? heading.slice(2).trim() : path.basename(sourcePath, ".md");
}

async function readKnowledgeDocuments() {
  const filenames = (await fs.readdir(knowledgeBaseDirectory))
    .filter((filename) => filename.endsWith(".md"))
    .sort();

  return Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.join(knowledgeBaseDirectory, filename);
      const content = await fs.readFile(filePath, "utf8");

      return {
        docId: metadataValue(content, "Doc ID"),
        title: documentTitle(content, filename),
        content,
        sourcePath: path.posix.join("data", "knowledge_base", filename),
        version: metadataValue(content, "Version"),
        audience: metadataValue(content, "Audience"),
      };
    }),
  );
}

async function seedCustomers(customers) {
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { customerId: customer.customer_id },
      create: {
        customerId: customer.customer_id,
        name: customer.name,
        email: customer.email,
        tier: customer.tier,
        country: customer.country,
        createdAt: new Date(customer.created_at),
        verified: customer.verified,
        tags: JSON.stringify(customer.tags),
      },
      update: {
        name: customer.name,
        email: customer.email,
        tier: customer.tier,
        country: customer.country,
        createdAt: new Date(customer.created_at),
        verified: customer.verified,
        tags: JSON.stringify(customer.tags),
      },
    });
  }
}

async function seedOrders(orders) {
  for (const order of orders) {
    await prisma.order.upsert({
      where: { orderId: order.order_id },
      create: {
        orderId: order.order_id,
        customerId: order.customer_id,
        status: order.status,
        placedAt: new Date(order.placed_at),
        deliveredAt: order.delivered_at ? new Date(order.delivered_at) : null,
        eligibleReturnUntil: order.eligible_return_until
          ? new Date(order.eligible_return_until)
          : null,
        total: order.total,
        currency: order.currency,
        paymentStatus: order.payment_status,
        trackingNumber: order.tracking_number ?? null,
        items: JSON.stringify(order.items),
      },
      update: {
        customerId: order.customer_id,
        status: order.status,
        placedAt: new Date(order.placed_at),
        deliveredAt: order.delivered_at ? new Date(order.delivered_at) : null,
        eligibleReturnUntil: order.eligible_return_until
          ? new Date(order.eligible_return_until)
          : null,
        total: order.total,
        currency: order.currency,
        paymentStatus: order.payment_status,
        trackingNumber: order.tracking_number ?? null,
        items: JSON.stringify(order.items),
      },
    });
  }
}

async function seedTickets(tickets) {
  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      where: { ticketId: ticket.ticket_id },
      create: {
        ticketId: ticket.ticket_id,
        customerId: ticket.customer_id,
        orderId: ticket.order_id ?? null,
        channel: ticket.channel,
        subject: ticket.subject,
        body: ticket.body,
        createdAt: new Date(ticket.created_at),
        status: ticket.status,
        expectedCategory: ticket.expected_category ?? null,
        expectedPriority: ticket.expected_priority ?? null,
        expectedSentiment: ticket.expected_sentiment ?? null,
        expectedEscalation: ticket.expected_escalation ?? null,
        expectedActions: JSON.stringify(ticket.expected_actions ?? []),
      },
      update: {
        customerId: ticket.customer_id,
        orderId: ticket.order_id ?? null,
        channel: ticket.channel,
        subject: ticket.subject,
        body: ticket.body,
        createdAt: new Date(ticket.created_at),
        status: ticket.status,
        expectedCategory: ticket.expected_category ?? null,
        expectedPriority: ticket.expected_priority ?? null,
        expectedSentiment: ticket.expected_sentiment ?? null,
        expectedEscalation: ticket.expected_escalation ?? null,
        expectedActions: JSON.stringify(ticket.expected_actions ?? []),
      },
    });
  }
}

async function seedKnowledgeDocuments(documents) {
  for (const document of documents) {
    await prisma.knowledgeDocument.upsert({
      where: { docId: document.docId },
      create: document,
      update: document,
    });
  }
}

function ticketForTool(tool, tickets) {
  const ticket = tickets.find((candidate) =>
    tool.allowed_categories.includes(candidate.expected_category),
  );

  if (!ticket) {
    throw new Error(`No seed ticket is compatible with tool '${tool.tool_name}'.`);
  }

  return ticket.ticket_id;
}

async function seedToolActions(tools, tickets) {
  for (const tool of tools) {
    const idempotencyKey = `catalog:${tool.tool_name}`;
    const data = {
      ticketId: ticketForTool(tool, tickets),
      toolName: tool.tool_name,
      payload: JSON.stringify({
        description: tool.description,
        allowedCategories: tool.allowed_categories,
        requiredFields: tool.required_fields,
        maxAmountInr: tool.max_amount_inr ?? null,
      }),
      riskLevel: tool.risk_level,
      requiresHumanApproval: tool.requires_human_approval,
      status: "catalog",
      idempotencyKey,
    };

    await prisma.toolAction.upsert({
      where: { idempotencyKey },
      create: data,
      update: data,
    });
  }
}

async function main() {
  const [customers, orders, tickets, tools, knowledgeDocuments] = await Promise.all([
    readJson("customers.json"),
    readJson("orders.json"),
    readJson("tickets.json"),
    readJson("tool_actions.json"),
    readKnowledgeDocuments(),
  ]);

  await seedCustomers(customers);
  await seedOrders(orders);
  await seedTickets(tickets);
  await seedKnowledgeDocuments(knowledgeDocuments);
  await seedToolActions(tools, tickets);

  console.log("TrustDesk seed completed.");
}

main()
  .catch((error) => {
    console.error("TrustDesk seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
