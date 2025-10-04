import {AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";
import {z} from "zod";

import * as chatCommands from "./chatCommands.ts";
import packageJSON from './package.json' with {type: 'json'};
import TemplateService, {TemplateChatRequestSchema} from "./TemplateService.ts";
import * as tools from "./tools.ts";


export const TemplateConfigSchema = z.record(
  z.string(),
  z.function({
    input: z.tuple([z.string()]),
    output: z.promise(TemplateChatRequestSchema)
  })
).optional();

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    const config = agentTeam.getConfigSlice('templates', TemplateConfigSchema);
    if (config) {
      agentTeam.addTools(packageInfo, tools)
      agentTeam.addChatCommands(chatCommands);

      agentTeam.addServices(new TemplateService(config));
    }
  },
};

export {default as TemplateService} from "./TemplateService.ts";