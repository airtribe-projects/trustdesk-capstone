const prisma = require("../config/prisma");

async function resetOperationalState() {
  await prisma.$transaction(async (transaction) => {
    const operationalActions = await transaction.toolAction.findMany({
      where: { status: { not: "catalog" } },
      select: { actionId: true },
    });

    const actionIds = operationalActions.map((action) => action.actionId);

    if (actionIds.length > 0) {
      await transaction.approval.deleteMany({
        where: { actionId: { in: actionIds } },
      });
    }

    await transaction.toolAction.deleteMany({
      where: { status: { not: "catalog" } },
    });
  });

  return { message: "Demo operational state reset successfully" };
}

module.exports = {
  resetOperationalState,
};
