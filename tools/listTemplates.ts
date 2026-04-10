import type {Agent} from "@tokenring-ai/agent";
import type {TokenRingToolDefinition, TokenRingToolJSONResult,} from "@tokenring-ai/chat/schema";
import {z} from "zod";
import TemplateService from "../TemplateService.ts";

const name = "template_list";
const displayName = "Template/listTemplates";

/**
 * Lists all available templates via the tool interface
 */
function execute(
  _args: z.output<typeof inputSchema>,
  agent: Agent,
): TokenRingToolJSONResult<{ templates: string[] }> {
  const templateRegistry: TemplateService =
    agent.requireServiceByType(TemplateService);

  const templates = templateRegistry.listTemplates();

  return {
    type: "json",
    data: {templates},
  };
}

const description =
  "Lists all available templates. Returns an array of template names that can be used with the runTemplate tool.";

const inputSchema = z.object({});

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
