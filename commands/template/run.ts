import type {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand,} from "@tokenring-ai/agent/types";
import TemplateService from "../../TemplateService.ts";

const inputSchema = {
  args: {},
  positionals: [
    {name: "templateName", description: "Template name", required: true},
  ],
  remainder: {name: "prompt", description: "Prompt for the template"},
} as const satisfies AgentCommandInputSchema;

export default {
  name: "template run",
  description: "Run a template",
  help: `Run a template with optional input text.

## Example

/template run summarize This is the text to summarize`,
  inputSchema,
  execute: async ({
                    positionals: {templateName},
                    remainder,
                    agent,
                  }: AgentCommandInputType<typeof inputSchema>): Promise<string> => {
    await agent
      .requireServiceByType(TemplateService)
      .runTemplate({templateName, input: remainder ?? ""}, agent);
    return "Template executed";
  },
} satisfies TokenRingAgentCommand<typeof inputSchema>;
