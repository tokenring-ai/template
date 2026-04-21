import { z } from "zod";

import type { TemplateChatRequestSchema } from "./TemplateService.ts";

export const TemplateConfigSchema = z.record(z.string(), z.custom<(input: string) => Promise<z.infer<typeof TemplateChatRequestSchema>>>()).exactOptional();

export { default as TemplateService } from "./TemplateService.ts";
