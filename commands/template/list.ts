import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import markdownList from "@tokenring-ai/utility/string/markdownList";
import TemplateService from "../../TemplateService.js";

export default {
  name: "template list",
  description: "List available templates",
  help: `# /template list

List all available templates.

## Example

/template list`,
  execute: async (_remainder: string, agent: Agent): Promise<string> => {
    const templates = agent.requireServiceByType(TemplateService).listTemplates();
    return templates.length === 0 ? "No templates available." : `Available templates:\n${markdownList(templates)}`;
  },
} satisfies TokenRingAgentCommand;
