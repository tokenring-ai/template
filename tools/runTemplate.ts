import ChatService from "@token-ring/chat/ChatService";
import {Registry} from "@token-ring/registry";
import {z} from "zod";
import TemplateRegistry from "../TemplateRegistry.ts";

export const name = "template/run";

/**
 * Runs a template with the given input via the tool interface
 */
export async function execute(
  {templateName, input}: { templateName?: string; input?: string },
  registry: Registry,
): Promise<{
  ok: boolean;
  output?: string;
  response?: any;
  usage?: any;
  timing?: any;
  error?: string;
}> {
  const chatService: ChatService = registry.requireFirstServiceByType(ChatService);
  const templateRegistry: TemplateRegistry =
    registry.requireFirstServiceByType(TemplateRegistry);

  chatService.infoLine(`[${name}] Running template: ${templateName}`);
  if (!templateName) {
    throw new Error("Template name is required");
  }
  if (!input) {
    throw new Error("Input is required");
  }


  return await templateRegistry.runTemplate({templateName, input}, registry);
}

export const description =
  "Run a template with the given input. Templates are predefined prompt patterns that generate AI requests.";

export const inputSchema = z.object({
  templateName: z.string().describe("The name of the template to run."),
  input: z.string().describe("The input to pass to the template."),
});
