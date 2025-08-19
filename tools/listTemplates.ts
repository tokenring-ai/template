import {Registry} from "@token-ring/registry";
import {z} from "zod";
import TemplateRegistry from "../TemplateRegistry.ts";

export const name = "template/list";

/**
 * Lists all available templates via the tool interface
 */
export async function execute({},
                              registry: Registry,
): Promise<{
  ok: boolean;
  templates: string[];
  error?: string;
}> {
  const templateRegistry: TemplateRegistry =
    registry.requireFirstServiceByType(TemplateRegistry);

  // Get the list of templates
  const templates = templateRegistry.list();

  return {
    ok: true,
    templates,
  };
}

export const description =
  "Lists all available templates. Returns an array of template names that can be used with the runTemplate tool.";

export const inputSchema = z.object({});
