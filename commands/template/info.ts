import Agent from "@tokenring-ai/agent/Agent";
import indent from "@tokenring-ai/utility/string/indent";
import TemplateService from "../../TemplateService.js";

export default async function info(remainder: string, agent: Agent): Promise<void> {
  const templateRegistry = agent.requireServiceByType(TemplateService);
  const templateName = remainder.trim();
  
  if (!templateName) {
    agent.infoMessage("Please provide a template name.");
    return;
  }

  const template = templateRegistry.getTemplateByName(templateName);
  if (!template) {
    agent.infoMessage(`Template not found: ${templateName}`);
    return;
  }

  const lines: string[] = [
    `Template: ${templateName}`,
    "Usage:",
    indent(`/template run ${templateName} <input>`, 1)
  ];
  agent.infoMessage(lines.join("\n"));
}
