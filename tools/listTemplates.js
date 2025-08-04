import TemplateRegistry from "../TemplateRegistry.js";
import { z } from "zod";

/**
 * Lists all available templates
 *
 * This function provides a way to retrieve the list of available templates programmatically through the tool interface.
 * It uses the TemplateRegistry's list method to get all registered template names.
 *
 * @async
 * @function execute
 * @param {Object} args - The execution parameters (empty for this tool)
 * @param {TokenRingRegistry} registry - The package registry for service resolution
 * @returns {Promise<Object>} Template listing result
 * @returns {boolean} return.ok - Whether the operation was successful
 * @returns {string[]} return.templates - Array of template names
 * @returns {string} [return.error] - Error message if operation failed
 * @throws {Error} Throws if registry services cannot be resolved
 *
 * @example
 * // Get all available templates
 * const result = await execute({}, registry);
 * if (result.ok) {
 *   console.log('Available templates:', result.templates);
 * }
 *
 * @since 1.0.0
 */
export default execute;
export async function execute({}, registry) {
	try {
		const templateRegistry =
			registry.requireFirstServiceByType(TemplateRegistry);

		// Get the list of templates
		const templates = templateRegistry.list();

		return {
			ok: true,
			templates,
		};
	} catch (err) {
		return {
			ok: false,
			error: err.message || "Unknown error listing templates",
			templates: [],
		};
	}
}

export const description =
	"Lists all available templates. Returns an array of template names that can be used with the runTemplate tool.";

export const parameters = z.object({});
