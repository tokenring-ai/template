import {AgentCommandService} from "@tokenring-ai/agent";
import type {TokenRingPlugin} from "@tokenring-ai/app";
import {ChatService} from "@tokenring-ai/chat";
import {z} from "zod";

import agentCommands from "./commands.ts";
import {TemplateConfigSchema} from "./index.ts";
import packageJSON from "./package.json" with {type: "json"};
import TemplateService from "./TemplateService.ts";
import tools from "./tools.ts";

const packageConfigSchema = z.object({
  templates: TemplateConfigSchema.optional(),
});

export default {
  name: packageJSON.name,
  displayName: "Content Templates",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (config.templates) {
      app.waitForService(ChatService, (chatService) =>
        chatService.addTools(...tools),
      );
      app.waitForService(AgentCommandService, (agentCommandService) =>
        agentCommandService.addAgentCommands(agentCommands),
      );

      app.addServices(new TemplateService(config.templates));
    }
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
