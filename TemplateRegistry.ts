import {Agent} from "@tokenring-ai/agent";
import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {TokenRingService} from "@tokenring-ai/agent/types";
import {ChatInputMessage} from "@tokenring-ai/ai-client/client/AIChatClient";
import runChat from "@tokenring-ai/ai-client/runChat";
import {outputChatAnalytics} from "@tokenring-ai/ai-client/util/outputChatAnalytics";

export type TemplateChatRequest = {
  // Request object to pass to runChat
  request: {
    input: ChatInputMessage[] | ChatInputMessage | string;
    systemPrompt?: ChatInputMessage | string;
    model: string;
  };
  // Name of the next template to run, if any
  nextTemplate?: string;

  // Whether to reset context; if true
  reset?: ResetWhat[];

  // Tools to enable during this template execution
  activeTools?: string[];
};

export type TemplateResult = {
  ok: boolean;
  output?: string;
  response?: any;
  error?: string;
  nextTemplateResult?: TemplateResult;
}

export type TemplateFunction = (input: string) => Promise<TemplateChatRequest>;

/**
 * Registry for prompt templates
 * Stores and manages template functions that can be used to generate chat requests
 */
export default class TemplateRegistry implements TokenRingService {
  name = "TemplateRegistry";
  description = "Provides a registry of prompt templates";

  /**
   * Map of template names to template functions
   */
  templates: Map<string, TemplateFunction> = new Map();

  /**
   * Register a template function with a name
   * @param name - The name of the template
   * @param template - The template function
   */
  register(name: string, template: TemplateFunction) {
    if (typeof template !== "function") {
      throw new Error(`Template must be a function, got ${typeof template}`);
    }
    this.templates.set(name, template);
  }

  /**
   * Unregister a template by name
   * @param name - The name of the template to unregister
   * @returns True if the template was unregistered, false if it wasn't found
   */
  unregister(name: string): boolean {
    return this.templates.delete(name);
  }

  /**
   * Get a template function by name
   * @param name - The name of the template
   * @returns The template function, or undefined if not found
   */
  get(name: string): TemplateFunction | undefined {
    return this.templates.get(name);
  }

  /**
   * List all registered template names
   * @returns Array of template names
   */
  list(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Load templates from an object
   * @param templates - Object mapping template names to template functions
   */
  loadTemplates(templates: Record<string, TemplateFunction> | undefined | null) {
    if (!templates || typeof templates !== "object") {
      return;
    }

    for (const [name, template] of Object.entries(templates)) {
      try {
        this.register(name, template);
      } catch (err: any) {
        console.error(`Error registering template '${name}':`, err?.message || err);
      }
    }
  }

  /**
   * Run a template with the given input
   */
  async runTemplate(
    {templateName, input, visitedTemplates = [] as string[]}:
    { templateName: string; input: string; visitedTemplates?: string[] },
    agent: Agent,
  ): Promise<TemplateResult> {

    if (!templateName) {
      throw new Error("Template name is required");
    }

    const template = this.get(templateName);

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Store original tool state for restoration
    let originalTools: string[] | null = null;
    let toolsChanged = false;

    try {
      // Execute the template function with the input
      const chatRequest = await template(input);

      // Check if the template wants to reset context
      if (chatRequest.reset) {
        agent.systemMessage(`Resetting ${chatRequest.reset.join(",")} context for template: ${templateName}`);
        agent.reset(chatRequest.reset);
      }

      // Handle activeTools option - save current tools and set new ones
      if (chatRequest.activeTools && Array.isArray(chatRequest.activeTools)) {
        originalTools = agent.tools.getAllItemNames();

        // Validate that all requested tools exist
        const availableTools: string[] = agent.tools.getAllItemNames()
        const invalidTools = chatRequest.activeTools.filter(
          (tool: string) => !availableTools.includes(tool),
        );

        if (invalidTools.length > 0) {
          throw new Error(`Template requested unknown tools: ${invalidTools.join(", ")}`);
        }

        agent.tools.setEnabledItems(chatRequest.activeTools);
        toolsChanged = true;
        agent.systemMessage(
          `Set active tools for template: ${chatRequest.activeTools.join(", ")}`,
        );
      }

      // Run the chat with the generated request
      const [templateOutput, response] = await runChat(chatRequest.request, agent);


      outputChatAnalytics(response, agent, templateName);

      // Prepare the result object
      const result: TemplateResult = {
        ok: true,
        output: templateOutput,
        response
      };

      // Check if the template wants to run another template next
      if (chatRequest.nextTemplate) {
        // Prevent circular references
        if (visitedTemplates.includes(chatRequest.nextTemplate)) {
          throw new Error(`Circular template reference detected: ${chatRequest.nextTemplate} has already been run in this chain.`);
        }

        // Log that we're running the next template
        agent.systemMessage(
          `Running next template: ${chatRequest.nextTemplate}`,
        );

        // Run the next template with the output of this template as input
        const nextTemplateResult = await this.runTemplate(
          {
            templateName: chatRequest.nextTemplate,
            input: templateOutput,
            visitedTemplates: [...visitedTemplates, templateName],
          },
          agent,
        );

        // Return combined results
        return {
          ...result,
          nextTemplateResult,
        };
      }

      return result;
    } finally {
      // Restore original tools if they were changed
      if (toolsChanged && originalTools !== null) {
        agent.tools.setEnabledItems(originalTools);
        agent.systemMessage(
          `Restored original tools: ${originalTools.join(", ") || "none"}`,
        );
      }
    }
  }
}
