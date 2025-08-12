import {Registry, Service} from "@token-ring/registry";
import ChatMessageStorage from "@token-ring/ai-client/ChatMessageStorage";
import { execute as runChat } from "@token-ring/ai-client/runChat";
import ChatService from "@token-ring/chat/ChatService";
import {ChatInputMessage} from "@token-ring/ai-client/client/AIChatClient";

export type TemplateChatRequest = {
  // Request object to pass to runChat
  request: {
      input: ChatInputMessage[] | ChatInputMessage | string;
      systemPrompt?: ChatInputMessage | string;
      model: string;
  };
  // Name of the next template to run, if any
  nextTemplate?: string;
  // Whether to reset context; if string, special handling for "history"
  resetContext?: boolean | "history";
  // Tools to enable during this template execution
  activeTools?: string[];
};

export type TemplateFunction = (input: string) => Promise<TemplateChatRequest>;

/**
 * Registry for prompt templates
 * Stores and manages template functions that can be used to generate chat requests
 */
export default class TemplateRegistry extends Service {
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
    { templateName, input, visitedTemplates = [] as string[] }:
      { templateName: string; input: string; visitedTemplates?: string[] },
    registry: Registry,
  ): Promise<any> {
    const chatService: ChatService = registry.requireFirstServiceByType(ChatService);

    if (!templateName) {
      chatService.systemLine("Template name is required");
      return { error: "Template name is required" };
    }

    const template = this.get(templateName);

    if (!template) {
      chatService.systemLine(`Template not found: ${templateName}`);
      return { error: `Template not found: ${templateName}` };
    }

    // Store original tool state for restoration
    let originalTools: string[] | null = null;
    let toolsChanged = false;

    try {
      // Execute the template function with the input
      const chatRequest = await template(input);

      // Check if the template wants to reset context
      if (chatRequest.resetContext) {
        const chatMessageStorage: ChatMessageStorage =
          registry.requireFirstServiceByType(ChatMessageStorage);
        chatMessageStorage.setCurrentMessage(null);
        if (chatRequest.resetContext !== "history") {
          chatService.emit("reset", null);
        }
        chatService.systemLine("Reset chat context for template execution.");
      }

      // Handle activeTools option - save current tools and set new ones
      if (chatRequest.activeTools && Array.isArray(chatRequest.activeTools)) {
        originalTools = registry.tools.getEnabledToolNames();

        // Validate that all requested tools exist
        const availableTools: string[] = registry.tools.getAvailableToolNames();
        const invalidTools = chatRequest.activeTools.filter(
          (tool: string) => !availableTools.includes(tool),
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
      let usageInfo: any = {};
      if (response.usage) {
        const { promptTokens, completionTokens, totalTokens, cost } = response.usage ;
        chatService.systemLine(
          `[Template Complete] Token usage - promptTokens: ${promptTokens}, completionTokens: ${completionTokens}, totalTokens: ${totalTokens}, cost: ${cost ?? "N/A"}`,
        );

        usageInfo.usage = response.usage;

        if (response.timing) {
          const { elapsedMs, tokensPerSec } = response.timing;
          const seconds = (elapsedMs / 1000).toFixed(2);
          const tps = tokensPerSec !== undefined ? tokensPerSec.toFixed(2) : "N/A";
          chatService.systemLine(
            `[Template Complete] Time: ${seconds}s, Throughput: ${tps} tokens/sec`,
          );

          usageInfo.timing = response.timing;
        }
      } else {
        chatService.systemLine("[Template Complete] Unknown token usage");
      }

      // Prepare the result object
      const result: any = {
        ok: true,
        output,
        response,
        ...usageInfo,
      };

      // Check if the template wants to run another template next
      if (chatRequest.nextTemplate) {
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
    } catch (error: any) {
      chatService.emit("doneWaiting", null);
      chatService.errorLine(`Error running template:`, error);
      return {
        ok: false,
        error: error?.message || "Unknown error running template",
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
