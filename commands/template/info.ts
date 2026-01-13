import Agent from "@tokenring-ai/agent/Agent";
import TemplateService from "../../TemplateService.js";

export default async function info(remainder: string, agent: Agent): Promise<void> {
  const templateRegistry = agent.requireServiceByType(TemplateService);
  const templateName = remainder.trim();
  
  if (!templateName) {
    agent.systemMessage("Please provide a template name.");
    return;
  }

  const template = templateRegistry.getTemplateByName(templateName);
  if (!template) {
    agent.systemMessage(`Template not found: ${templateName}`);
    return;
  }

  agent.systemMessage(`Template: ${templateName}`);
  agent.systemMessage("Usage:");
  agent.systemMessage(`  /template run ${templateName} <input>`);
}
