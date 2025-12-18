import {z} from "zod";

import {TemplateChatRequestSchema} from "./TemplateService.ts";


export const TemplateConfigSchema = z.record(
  z.string(),
  z.custom<(input: string) => Promise<z.infer<typeof TemplateChatRequestSchema>>>()
).optional();



export {default as TemplateService} from "./TemplateService.ts";