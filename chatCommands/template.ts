import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import TemplateService from "../TemplateService.ts";

const description = "/template - Run prompt templates";

async function execute(remainder: string, agent: Agent) {
  const templateRegistry: TemplateService = agent.requireServiceByType(TemplateService);

  // Parse the command
  const args = remainder?.trim().split(/\s+/);
  const subCommand = args?.[0]?.toLowerCase();

  if (!subCommand) {
    showHelp(agent);
    return;
  }

  switch (subCommand) {
    case "list":
      listTemplates(templateRegistry, agent);
      break;
    case "run":
      await runTemplate(args.slice(1), templateRegistry, agent);
      break;
    case "info":
      showTemplateInfo(args[1],templateRegistry, agent);
      break;
    default:
      agent.systemMessage(`Unknown subcommand: ${subCommand}`);
      showHelp(agent);
      break;
  }
}

function showHelp(agent: Agent) {
  agent.systemMessage("Template Command Usage:");
  agent.systemMessage("  /template list - List all available templates");
  agent.systemMessage(
    "  /template run <templateName> [input] - Run a template with optional input",
  );
  agent.systemMessage(
    "  /template info <templateName> - Show information about a template",
  );
}

function listTemplates(templateRegistry: TemplateService, agent: Agent) {
  const templates = templateRegistry.listTemplates();

  if (templates.length === 0) {
    agent.systemMessage("No templates available.");
    return;
  }

  agent.systemMessage("Available templates:");
  templates.forEach((name) => {
    agent.systemMessage(`  - ${name}`);
  });
}

function showTemplateInfo(templateName: string | undefined, templateRegistry: TemplateService, agent: Agent) {
  if (!templateName) {
    agent.systemMessage("Please provide a template name.");
    return;
  }

  const template = templateRegistry.getTemplateByName(templateName);
  if (!template) {
    agent.systemMessage(`Template not found: ${templateName}`);
    return;
  }

  agent.systemMessage(`Template: ${templateName}`);
  agent.systemMessage("Usage:");
  agent.systemMessage(`  /template run ${templateName} <input>`);
}

async function runTemplate(
  args: string[],
  templateRegistry: TemplateService,
  agent: Agent,
) {
  if (!args || args.length < 1) {
    agent.systemMessage("Please provide a template name.");
    return;
  }

  const templateName = args[0];

  // Extract the input from the remaining arguments
  const input = args.slice(1).join(" ");

  // Use the TemplateRegistry's runTemplate method
  await templateRegistry.runTemplate({templateName, input: input || ""}, agent);
}

function help() {
  return [
    "/template list",
    "  - Lists all available templates",
    "/template run <templateName> [input]",
    "  - Runs the specified template with optional input",
    "/template info <templateName>",
    "  - Shows information about a specific template",
  ];
}

export default {
  description,
  execute,
  help,
} as TokenRingAgentCommand