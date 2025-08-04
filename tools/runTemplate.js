import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import TemplateRegistry from "../TemplateRegistry.js";

/**
 * Runs a template with the given input
 *
 * This function provides a way to execute templates programmatically through the tool interface.
 * It uses the TemplateRegistry's runTemplate method to execute the template with the given input.
 *
 * @async
 * @function execute
 * @param {Object} args - The execution parameters
 * @param {string} args.templateName - The name of the template to run. Required.
 * @param {string} args.input - The input to pass to the template. Required.
 * @param {TokenRingRegistry} registry - The package registry for service resolution
 * @returns {Promise<Object>} Template execution result
 * @returns {boolean} return.ok - Whether the template executed successfully
 * @returns {string} return.output - The output from the template execution
 * @returns {Object} return.response - The full response from the template execution
 * @returns {Object} [return.usage] - Token usage information if available
 * @returns {Object} [return.timing] - Timing information if available
 * @returns {string} [return.error] - Error message if execution failed
 * @throws {Error} Throws if registry services cannot be resolved
 *
 * @example
 * // Basic template execution
 * const result = await execute({
 *   templateName: 'summarize',
 *   input: 'Text to summarize'
 * }, registry);
 * if (result.ok) {
 *   console.log('Summary:', result.output);
 * }
 *
 * @example
 * // Handling template failures
 * const result = await execute({
 *   templateName: 'analyze',
 *   input: 'Text to analyze'
 * }, registry);
 * if (!result.ok) {
 *   console.error('Template execution failed:', result.error);
 * }
 *
 * @since 1.0.0
 */
export default execute;
export async function execute({ templateName, input }, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const templateRegistry = registry.requireFirstServiceByType(TemplateRegistry);

	chatService.infoLine(`[runTemplate] Running template: ${templateName}`);

	try {
		// Use the TemplateRegistry's runTemplate method
		const result = await templateRegistry.runTemplate(
			{ templateName, input },
			registry,
		);
		return result;
	} catch (err) {
		return {
			ok: false,
			error: err.message || "Unknown error running template",
		};
	}
}

export const description =
	"Run a template with the given input. Templates are predefined prompt patterns that generate AI requests.";

export const parameters = z.object({
	templateName: z.string().describe("The name of the template to run."),
	input: z.string().describe("The input to pass to the template."),
});
