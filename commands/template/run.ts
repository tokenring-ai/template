import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TemplateService from "../../TemplateService.js";

export default {
  name: "template run",
  description: "/template run - Run a template",
  help: `# /template run <templateName> [input]

Run a template with optional input text.

## Example

/template run summarize This is the text to summarize`,
  execute: async (remainder: string, agent: Agent): Promise<string> => {
    const args = remainder.trim().split(/\s+/);
    if (!args[0]) return "Please provide a template name.";
    await agent.requireServiceByType(TemplateService).runTemplate({ templateName: args[0], input: args.slice(1).join(" ") || "" }, agent);
    return "Template executed";
  },
} satisfies TokenRingAgentCommand;
