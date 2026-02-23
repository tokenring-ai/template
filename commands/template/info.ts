import Agent from "@tokenring-ai/agent/Agent";
import indent from "@tokenring-ai/utility/string/indent";
import TemplateService from "../../TemplateService.js";

export default async function info(remainder: string, agent: Agent): Promise<string> {
  const templateRegistry = agent.requireServiceByType(TemplateService);
  const templateName = remainder.trim();
  
  if (!templateName) {
    return "Please provide a template name.";
  }

  const template = templateRegistry.getTemplateByName(templateName);
  if (!template) {
    return `Template not found: ${templateName}`;
  }

  const lines: string[] = [
    `Template: ${templateName}`,
    "Usage:",
    indent(`/template run ${templateName} <input>`, 1)
  ];
  return lines.join("\n");
}
