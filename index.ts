import {AgentCommandService, AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";
import {ChatService} from "@tokenring-ai/chat";
import {z} from "zod";

import * as chatCommands from "./chatCommands.ts";
import packageJSON from './package.json' with {type: 'json'};
import TemplateService, {TemplateChatRequestSchema} from "./TemplateService.ts";
import * as tools from "./tools.ts";


export const TemplateConfigSchema = z.record(
  z.string(),
  z.custom<(input: string) => Promise<z.infer<typeof TemplateChatRequestSchema>>>()
).optional();

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    const config = agentTeam.getConfigSlice('templates', TemplateConfigSchema);
    if (config) {
      agentTeam.waitForService(ChatService, chatService =>
        chatService.addTools(packageJSON.name, tools)
      );
      agentTeam.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );

      agentTeam.addServices(new TemplateService(config));
    }
  },
} as TokenRingPackage;

export {default as TemplateService} from "./TemplateService.ts";