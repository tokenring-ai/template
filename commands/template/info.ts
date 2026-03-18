import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import indent from "@tokenring-ai/utility/string/indent";
import TemplateService from "../../TemplateService.js";

const inputSchema = {
  args: {},
  positionals: [{name: "templateName", description: "Template name", required: true}]
} as const satisfies AgentCommandInputSchema;

export default {
  name: "template info",
  description: "Show info about a template",
  help: `Show information about a specific template.

## Example

/template info summarize`,
  inputSchema,
  execute: async ({positionals: { templateName }, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    const template = agent.requireServiceByType(TemplateService).getTemplateByName(templateName);
    if (!template) return `Template not found: ${templateName}`;
    return [`Template: ${templateName}`, "Usage:", indent(`/template run ${templateName} <input>`, 1)].join("\n");
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
