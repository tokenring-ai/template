import { Service } from "@token-ring/registry";

/**
 * @typedef {function(string): Promise<Object>} TemplateFunction
 * A function that takes an input string and returns a Promise that resolves to a ChatRequest object
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
}
