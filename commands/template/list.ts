import Agent from "@tokenring-ai/agent/Agent";
import TemplateService from "../../TemplateService.js";

export default async function list(_remainder: string, agent: Agent): Promise<void> {
  const templateRegistry = agent.requireServiceByType(TemplateService);
  const templates = templateRegistry.listTemplates();

  if (templates.length === 0) {
    agent.systemMessage("No templates available.");
    return;
  }

  agent.systemMessage("Available templates:");
  templates.forEach((name) => {
    agent.systemMessage(`  - ${name}`);
  });
}
