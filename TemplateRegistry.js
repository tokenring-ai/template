import { Service } from "@token-ring/registry";
import ChatMessageStorage from "@token-ring/ai-client/ChatMessageStorage";
import runChat from "@token-ring/ai-client/runChat.js";
import ChatService from "@token-ring/chat/ChatService";

/**
 * @typedef {function(string): Promise<Object>} TemplateFunction
 * A function that takes an input string and returns a Promise that resolves to a ChatRequest object.
 * The ChatRequest object can include a 'nextTemplate' property to specify another template to run after this one.
 */

/**
 * Registry for prompt templates
 * Stores and manages template functions that can be used to generate chat requests
 */
export default class TemplateRegistry extends Service {
	name = "TemplateRegistry";
	description = "Provides a registry of prompt templates";

	/**
	 * Map of template names to template functions
	 * @type {Map<string, TemplateFunction>}
	 */
	templates = new Map();

	/**
	 * Register a template function with a name
	 * @param {string} name - The name of the template
	 * @param {TemplateFunction} template - The template function
	 */
	register(name, template) {
		if (typeof template !== "function") {
			throw new Error(`Template must be a function, got ${typeof template}`);
		}
		this.templates.set(name, template);
	}

	/**
	 * Unregister a template by name
	 * @param {string} name - The name of the template to unregister
	 * @returns {boolean} - True if the template was unregistered, false if it wasn't found
	 */
	unregister(name) {
		return this.templates.delete(name);
	}

	/**
	 * Get a template function by name
	 * @param {string} name - The name of the template
	 * @returns {TemplateFunction|undefined} - The template function, or undefined if not found
	 */
	get(name) {
		return this.templates.get(name);
	}

	/**
	 * List all registered template names
	 * @returns {string[]} - Array of template names
	 */
	list() {
		return Array.from(this.templates.keys());
	}

	/**
	 * Load templates from a directory
	 * @param {Object<string, TemplateFunction>} templates - Object mapping template names to template functions
	 */
	loadTemplates(templates) {
		if (!templates || typeof templates !== "object") {
			return;
		}

		for (const [name, template] of Object.entries(templates)) {
			try {
				this.register(name, template);
			} catch (err) {
				console.error(
					`Error registering template '${name}':`,
					err.message || err,
				);
			}
		}
	}

	/**
	 * Run a template with the given input
	 *
	 * @param {Object} params - Parameters for running the template
	 * @param {string} params.templateName - The name of the template to run
	 * @param {string} params.input - The input to pass to the template
	 * @param {string} [params.visitedTemplates] - Array of template names that have already been run (to prevent circular references)
	 * @param {TokenRingRegistry} registry - The registry containing required services
	 * @returns {Promise<Object>} - The result of running the template
	 */
	async runTemplate({ templateName, input, visitedTemplates = [] }, registry) {
		const chatService = registry.requireFirstServiceByType(ChatService);

		if (!templateName) {
			chatService.systemLine("Template name is required");
			return { error: "Template name is required" };
		}

		const template = this.get(templateName);

		if (!template) {
			chatService.systemLine(`Template not found: ${templateName}`);
			return { error: `Template not found: ${templateName}` };
		}

		if (!input) {
			chatService.systemLine("Input is required for the template");
			return { error: "Input is required for the template" };
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
				if (chatRequest.resetContext !== "history") {
					chatService.emit("reset");
				}
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
					return {
						error: `Template requested unknown tools: ${invalidTools.join(", ")}`,
					};
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
			let usageInfo = {};
			if (response.usage) {
				const { promptTokens, completionTokens, totalTokens, cost } =
					response.usage;
				chatService.systemLine(
					`[Template Complete] Token usage - promptTokens: ${promptTokens}, completionTokens: ${completionTokens}, totalTokens: ${totalTokens}, cost: ${cost}`,
				);

				usageInfo.usage = response.usage;

				if (response.timing) {
					const { elapsedMs, tokensPerSec } = response.timing;
					const seconds = (elapsedMs / 1000).toFixed(2);
					const tps =
						tokensPerSec !== undefined ? tokensPerSec.toFixed(2) : "N/A";
					chatService.systemLine(
						`[Template Complete] Time: ${seconds}s, Throughput: ${tps} tokens/sec`,
					);

					usageInfo.timing = response.timing;
				}
			} else {
				chatService.systemLine("[Template Complete] Unknown token usage");
			}

			// Prepare the result object
			const result = {
				ok: true,
				output,
				response,
				...usageInfo,
			};

			// Check if the template wants to run another template next
			if (chatRequest.nextTemplate) {
				// TODO: Evaluate whether we actually need this or whether it could arbitrarily limit legitimate use cases
				// Prevent circular references
				if (visitedTemplates.includes(chatRequest.nextTemplate)) {
					chatService.errorLine(
						`Circular template reference detected: ${chatRequest.nextTemplate} has already been run in this chain.`,
					);
					return {
						...result,
						error: `Circular template reference detected: ${chatRequest.nextTemplate}`,
					};
				}

				// Log that we're running the next template
				chatService.systemLine(
					`Running next template: ${chatRequest.nextTemplate}`,
				);

				// Run the next template with the output of this template as input
				const nextTemplateResult = await this.runTemplate(
					{
						templateName: chatRequest.nextTemplate,
						input: output,
						visitedTemplates: [...visitedTemplates, templateName],
					},
					registry,
				);

				// Return combined results
				return {
					...result,
					nextTemplateResult,
				};
			}

			return result;
		} catch (error) {
			chatService.emit("doneWaiting");
			chatService.errorLine(`Error running template:`, error);
			return {
				ok: false,
				error: error.message || "Unknown error running template",
			};
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
}
