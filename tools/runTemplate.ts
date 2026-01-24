import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingToolDefinition} from "@tokenring-ai/chat/schema";
import {z} from "zod";
import TemplateService from "../TemplateService.ts";

const name = "template_run";
const displayName = "Template/runTemplate";

/**
 * Runs a template with the given input via the tool interface
 */
async function execute(
  {templateName, input}: z.infer<typeof inputSchema>,
  agent: Agent,
): Promise<{
  ok: boolean;
  output?: string;
  response?: any;
  usage?: any;
  timing?: any;
  error?: string;
}> {
  const templateRegistry: TemplateService =
    agent.requireServiceByType(TemplateService);

  agent.infoMessage(`[${name}] Running template: ${templateName}`);
  if (!templateName) {
    throw new Error("Template name is required");
  }
  if (!input) {
    throw new Error("Input is required");
  }


  return await templateRegistry.runTemplate({templateName, input}, agent);
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
