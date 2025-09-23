import {Agent} from "@tokenring-ai/agent";
import {z} from "zod";
import TemplateService from "../TemplateService.ts";

export const name = "template/list";

/**
 * Lists all available templates via the tool interface
 */
export async function execute({}, agent: Agent): Promise<{
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

export const description =
  "Lists all available templates. Returns an array of template names that can be used with the runTemplate tool.";

export const inputSchema = z.object({});
