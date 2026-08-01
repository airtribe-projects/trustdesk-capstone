class AIProvider {
  async classifyTicket(ticket, documents) {
    throw new Error("AIProvider.classifyTicket must be implemented by a provider");
  }

  async generateDraft(ticket, documents) {
    throw new Error("AIProvider.generateDraft must be implemented by a provider");
  }
}

module.exports = AIProvider;
