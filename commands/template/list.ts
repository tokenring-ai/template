import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import markdownList from "@tokenring-ai/utility/string/markdownList";
import TemplateService from "../../TemplateService.js";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

export default {
  name: "template list",
  description: "List available templates",
  help: `List all available templates.

## Example

/template list`,
  inputSchema,
  execute: async ({agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    const templates = agent.requireServiceByType(TemplateService).listTemplates();
    return templates.length === 0 ? "No templates available." : `Available templates:\n${markdownList(templates)}`;
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
