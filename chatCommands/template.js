import ChatMessageStorage from "@token-ring/ai-client/ChatMessageStorage";
import runChat from "@token-ring/ai-client/runChat.js";
import { HumanInterfaceService } from "@token-ring/chat";
import ChatService from "@token-ring/chat/ChatService";
import TemplateRegistry from "../TemplateRegistry.js";

export const description = "/template - Run prompt templates";

export async function execute(remainder, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const humanInterfaceService = registry.getFirstServiceByType(
		HumanInterfaceService,
	);
	const templateRegistry = registry.requireFirstServiceByType(TemplateRegistry);

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

function showHelp(chatService) {
	chatService.systemLine("Template Command Usage:");
	chatService.systemLine("  /template list - List all available templates");
	chatService.systemLine(
		"  /template run <templateName> <input> - Run a template with the given input",
	);
	chatService.systemLine(
		"  /template info <templateName> - Show information about a template",
	);
}

function listTemplates(chatService, templateRegistry) {
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

function showTemplateInfo(templateName, chatService, templateRegistry) {
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

async function runTemplate(args, chatService, templateRegistry, registry) {
	if (!args || args.length < 1) {
		chatService.systemLine("Please provide a template name and input.");
		return;
	}

	const templateName = args[0];
	const template = templateRegistry.get(templateName);

	if (!template) {
		chatService.systemLine(`Template not found: ${templateName}`);
		return;
	}

	// Extract the input from the remaining arguments
	const input = args.slice(1).join(" ");

	if (!input) {
		chatService.systemLine("Please provide input for the template.");
		return;
	}

	// Store original tool state for restoration
	let originalTools = null;
	let toolsChanged = false;

	try {
		// Execute the template function with the input
		const chatRequest = await template(input);

		// Check if the template wants to reset context
		if (chatRequest.resetContext) {
			const chatMessageStorage =
				registry.requireFirstServiceByType(ChatMessageStorage);
			chatMessageStorage.setCurrentMessage(null);
			chatService.emit("reset");
			chatService.systemLine("Reset chat context for template execution.");
		}

		// Handle activeTools option - save current tools and set new ones
		if (chatRequest.activeTools && Array.isArray(chatRequest.activeTools)) {
			originalTools = registry.tools.getEnabledToolNames();

			// Validate that all requested tools exist
			const availableTools = registry.tools.getAvailableToolNames();
			const invalidTools = chatRequest.activeTools.filter(
				(tool) => !availableTools.includes(tool),
			);

			if (invalidTools.length > 0) {
				chatService.errorLine(
					`Template requested unknown tools: ${invalidTools.join(", ")}`,
				);
				return;
			}

			await registry.tools.setEnabledTools(...chatRequest.activeTools);
			toolsChanged = true;
			chatService.systemLine(
				`Set active tools for template: ${chatRequest.activeTools.join(", ")}`,
			);
		}

		// Run the chat with the generated request
		const [output, response] = await runChat(chatRequest.request, registry);

		// Report token usage if available
		if (response.usage) {
			const { promptTokens, completionTokens, totalTokens, cost } =
				response.usage;
			chatService.systemLine(
				`[Template Complete] Token usage - promptTokens: ${promptTokens}, completionTokens: ${completionTokens}, totalTokens: ${totalTokens}, cost: ${cost}`,
			);
			if (response.timing) {
				const { elapsedMs, tokensPerSec } = response.timing;
				const seconds = (elapsedMs / 1000).toFixed(2);
				const tps =
					tokensPerSec !== undefined ? tokensPerSec.toFixed(2) : "N/A";
				chatService.systemLine(
					`[Template Complete] Time: ${seconds}s, Throughput: ${tps} tokens/sec`,
				);
			}
		} else {
			chatService.systemLine("[Template Complete] Unknown token usage");
		}
	} catch (error) {
		chatService.emit("doneWaiting");
		chatService.errorLine(`Error running template:`, error);
	} finally {
		// Restore original tools if they were changed
		if (toolsChanged && originalTools !== null) {
			await registry.tools.setEnabledTools(...originalTools);
			chatService.systemLine(
				`Restored original tools: ${originalTools.join(", ") || "none"}`,
			);
		}
	}
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
