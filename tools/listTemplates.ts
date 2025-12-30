import {Agent} from "@tokenring-ai/agent";
import {TokenRingToolDefinition} from "@tokenring-ai/chat/schema";
import {z} from "zod";
import TemplateService from "../TemplateService.ts";

const name = "template_list";

/**
 * Lists all available templates via the tool interface
 */
async function execute({}: z.infer<typeof inputSchema>, agent: Agent): Promise<{
  ok: boolean;
  templates: string[];
  error?: string;
}> {
  const templateRegistry: TemplateService =
    agent.requireServiceByType(TemplateService);

  // Get the list of templates
  const templates = templateRegistry.listTemplates();

  return {
    ok: true,
    templates,
  };
}

const description =
  "Lists all available templates. Returns an array of template names that can be used with the runTemplate tool.";

const inputSchema = z.object({});

export default {
  name, description, inputSchema, execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
