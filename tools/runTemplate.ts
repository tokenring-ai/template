import Agent from "@tokenring-ai/agent/Agent";
import {z} from "zod";
import TemplateService from "../TemplateService.ts";

export const name = "template/run";

/**
 * Runs a template with the given input via the tool interface
 */
export async function execute(
  {templateName, input}: { templateName?: string; input?: string },
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

  agent.infoLine(`[${name}] Running template: ${templateName}`);
  if (!templateName) {
    throw new Error("Template name is required");
  }
  if (!input) {
    throw new Error("Input is required");
  }


  return await templateRegistry.runTemplate({templateName, input}, agent);
}

export const description =
  "Run a template with the given input. Templates are predefined prompt patterns that generate AI requests.";

export const inputSchema = z.object({
  templateName: z.string().describe("The name of the template to run."),
  input: z.string().describe("The input to pass to the template."),
});
