import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TemplateService from "../../TemplateService.js";

const inputSchema = {
  args: {},
  positionals: [
    {name: "templateName", description: "Template name", required: true},
    {name: "prompt", description: "Prompt for the template", required: false, defaultValue: "", greedy: true},
  ],
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

export default {
  name: "template run",
  description: "Run a template",
  help: `Run a template with optional input text.

## Example

/template run summarize This is the text to summarize`,
  inputSchema,
  execute: async ({positionals: { templateName, prompt }, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    await agent.requireServiceByType(TemplateService).runTemplate({ templateName, input: prompt }, agent);
    return "Template executed";
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
