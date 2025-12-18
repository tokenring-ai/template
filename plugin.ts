import {AgentCommandService} from "@tokenring-ai/agent";
import TokenRingApp, {TokenRingPlugin} from "@tokenring-ai/app";
import {ChatService} from "@tokenring-ai/chat";

import chatCommands from "./chatCommands.ts";
import {TemplateConfigSchema} from "./index.ts";
import packageJSON from './package.json' with {type: 'json'};
import TemplateService from "./TemplateService.ts";
import tools from "./tools.ts";



export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    const config = app.getConfigSlice('templates', TemplateConfigSchema);
    if (config) {
      app.waitForService(ChatService, chatService =>
        chatService.addTools(packageJSON.name, tools)
      );
      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );

      app.addServices(new TemplateService(config));
    }
  },
} satisfies TokenRingPlugin;
