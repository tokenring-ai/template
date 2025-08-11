import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import TemplateRegistry from "../TemplateRegistry.ts";

/**
 * Runs a template with the given input via the tool interface
 */
export default execute;
export async function execute(
  { templateName, input }: { templateName: string; input: string },
  registry: any,
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

  chatService.infoLine(`[runTemplate] Running template: ${templateName}`);

  try {
    // Use the TemplateRegistry's runTemplate method
    return await templateRegistry.runTemplate({ templateName, input }, registry);
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Unknown error running template",
    };
  }
}

export const description =
  "Run a template with the given input. Templates are predefined prompt patterns that generate AI requests.";

export const parameters = z.object({
  templateName: z.string().describe("The name of the template to run."),
  input: z.string().describe("The input to pass to the template."),
});
