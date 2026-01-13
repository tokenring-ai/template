import Agent from "@tokenring-ai/agent/Agent";
import TemplateService from "../../TemplateService.js";

export default async function run(remainder: string, agent: Agent): Promise<void> {
  const templateRegistry = agent.requireServiceByType(TemplateService);
  const args = remainder.trim().split(/\s+/);
  
  if (!args || args.length < 1 || !args[0]) {
    agent.systemMessage("Please provide a template name.");
    return;
  }

  const templateName = args[0];
  const input = args.slice(1).join(" ");

  await templateRegistry.runTemplate({templateName, input: input || ""}, agent);
}
