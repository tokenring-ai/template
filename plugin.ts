import {AgentCommandService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {ChatService} from "@tokenring-ai/chat";
import {z} from "zod";

import chatCommands from "./chatCommands.ts";
import {TemplateConfigSchema} from "./index.ts";
import packageJSON from './package.json' with {type: 'json'};
import TemplateService from "./TemplateService.ts";
import tools from "./tools.ts";

const packageConfigSchema = z.object({
  templates: TemplateConfigSchema.optional()
});


export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (config.templates) {
      app.waitForService(ChatService, chatService =>
        chatService.addTools(tools)
      );
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );

      app.addServices(new TemplateService(config.templates));
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
