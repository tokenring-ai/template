import { HumanInterfaceService } from "@token-ring/chat";
import ChatService from "@token-ring/chat/ChatService";
import TemplateRegistry from "../TemplateRegistry.ts";

export const description = "/template - Run prompt templates";

export async function execute(remainder: string, registry: any) {
  const chatService: ChatService = registry.requireFirstServiceByType(ChatService);
  const _humanInterfaceService = registry.getFirstServiceByType(
    HumanInterfaceService,
  );
  const templateRegistry: TemplateRegistry = registry.requireFirstServiceByType(TemplateRegistry);

  // Parse the command
  const args = remainder?.trim().split(/\s+/);
  const subCommand = args?.[0]?.toLowerCase();

  if (!subCommand) {
    showHelp(chatService);
    return;
  }

  switch (subCommand) {
    case "list":
      listTemplates(chatService, templateRegistry);
      break;
    case "run":
      await runTemplate(args.slice(1), chatService, templateRegistry, registry);
      break;
    case "info":
      showTemplateInfo(args[1], chatService, templateRegistry);
      break;
    default:
      chatService.systemLine(`Unknown subcommand: ${subCommand}`);
      showHelp(chatService);
      break;
  }
}

function showHelp(chatService: ChatService) {
  chatService.systemLine("Template Command Usage:");
  chatService.systemLine("  /template list - List all available templates");
  chatService.systemLine(
    "  /template run <templateName> <input> - Run a template with the given input",
  );
  chatService.systemLine(
    "  /template info <templateName> - Show information about a template",
  );
}

function listTemplates(chatService: ChatService, templateRegistry: TemplateRegistry) {
  const templates = templateRegistry.list();

  if (templates.length === 0) {
    chatService.systemLine("No templates available.");
    return;
  }

  chatService.systemLine("Available templates:");
  templates.forEach((name) => {
    chatService.systemLine(`  - ${name}`);
  });
}

function showTemplateInfo(templateName: string, chatService: ChatService, templateRegistry: TemplateRegistry) {
  if (!templateName) {
    chatService.systemLine("Please provide a template name.");
    return;
  }

  const template = templateRegistry.get(templateName);
  if (!template) {
    chatService.systemLine(`Template not found: ${templateName}`);
    return;
  }

  chatService.systemLine(`Template: ${templateName}`);
  chatService.systemLine("Usage:");
  chatService.systemLine(`  /template run ${templateName} <input>`);
}

async function runTemplate(
  args: string[],
  chatService: ChatService,
  templateRegistry: TemplateRegistry,
  registry: any,
) {
  if (!args || args.length < 1) {
    chatService.systemLine("Please provide a template name and input.");
    return;
  }

  const templateName = args[0];

  // Extract the input from the remaining arguments
  const input = args.slice(1).join(" ");

  if (!input) {
    chatService.systemLine("Please provide input for the template.");
    return;
  }

  // Use the TemplateRegistry's runTemplate method
  await templateRegistry.runTemplate({ templateName, input }, registry);
}

export function help() {
  return [
    "/template list",
    "  - Lists all available templates",
    "/template run <templateName> <input>",
    "  - Runs the specified template with the given input",
    "/template info <templateName>",
    "  - Shows information about a specific template",
  ];
}
