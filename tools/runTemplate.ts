import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingToolDefinition, type TokenRingToolJSONResult} from "@tokenring-ai/chat/schema";
import {z} from "zod";
import TemplateService from "../TemplateService.ts";

const name = "template_run";
const displayName = "Template/runTemplate";

/**
 * Runs a template with the given input via the tool interface
 */
async function execute(
  {templateName, input}: z.output<typeof inputSchema>,
  agent: Agent,
): Promise<TokenRingToolJSONResult<{
  output?: string;
  response?: any;
}>> {
  const templateRegistry: TemplateService =
    agent.requireServiceByType(TemplateService);

  agent.infoMessage(`[${name}] Running template: ${templateName}`);

  const result = await templateRegistry.runTemplate({templateName, input}, agent);
  
  if (!result.ok) {
    throw new Error(result.error || "Template execution failed");
  }

  return {
    type: "json",
    data: {
      output: result.output,
      response: result.response,
    }
  };
}

const description =
  "Run a template with the given input. Templates are predefined prompt patterns that generate AI requests.";

const inputSchema = z.object({
  templateName: z.string().describe("The name of the template to run."),
  input: z.string().describe("The input to pass to the template."),
});

export default {
  name, displayName, description, inputSchema, execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
