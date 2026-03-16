import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import indent from "@tokenring-ai/utility/string/indent";
import TemplateService from "../../TemplateService.js";

export default {
  name: "template info",
  description: "Show info about a template",
  help: `# /template info <templateName>

Show information about a specific template.

## Example

/template info summarize`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    const templateName = remainder.trim();
    if (!templateName) return "Please provide a template name.";
    const template = agent.requireServiceByType(TemplateService).getTemplateByName(templateName);
    if (!template) return `Template not found: ${templateName}`;
    return [`Template: ${templateName}`, "Usage:", indent(`/template run ${templateName} <input>`, 1)].join("\n");
  },
} satisfies TokenRingAgentCommand;
