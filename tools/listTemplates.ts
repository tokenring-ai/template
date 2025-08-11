import TemplateRegistry from "../TemplateRegistry.ts";
import { z } from "zod";

/**
 * Lists all available templates via the tool interface
 */
export default execute;
export async function execute(
  {}: Record<string, never>,
  registry: any,
): Promise<{
  ok: boolean;
  templates: string[];
  error?: string;
}> {
  try {
    const templateRegistry: TemplateRegistry =
      registry.requireFirstServiceByType(TemplateRegistry);

    // Get the list of templates
    const templates = templateRegistry.list();

    return {
      ok: true,
      templates,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Unknown error listing templates",
      templates: [],
    };
  }
}

export const description =
  "Lists all available templates. Returns an array of template names that can be used with the runTemplate tool.";

export const parameters = z.object({});
