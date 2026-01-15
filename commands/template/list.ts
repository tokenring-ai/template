import Agent from "@tokenring-ai/agent/Agent";
import markdownList from "@tokenring-ai/utility/string/markdownList";
import TemplateService from "../../TemplateService.js";

export default async function list(_remainder: string, agent: Agent): Promise<void> {
  const templateRegistry = agent.requireServiceByType(TemplateService);
  const templates = templateRegistry.listTemplates();

  if (templates.length === 0) {
    agent.infoMessage("No templates available.");
    return;
  }

  const lines: string[] = [
    "Available templates:",
    markdownList(templates)
  ];
  agent.infoMessage(lines.join("\n"));
}
