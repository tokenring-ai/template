import {Agent} from "@tokenring-ai/agent";
import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {AIResponse} from "@tokenring-ai/ai-client/client/AIChatClient";
import {TokenRingService} from "@tokenring-ai/app/types";
import {ChatService} from "@tokenring-ai/chat";
import runChat from "@tokenring-ai/chat/runChat";
import {getChatAnalytics} from "@tokenring-ai/chat/util/getChatAnalytics";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import {z} from "zod";

export const TemplateChatRequestSchema = z.object({
  inputs: z.array(z.string()),
  // Name of the next template to run, if any
  nextTemplate: z.string().optional(),
  // Whether to reset context; if true
  reset: z.array(z.custom<ResetWhat>()).optional(),
  // Tools to enable during this template execution
  activeTools: z.array(z.string()).optional(),
});

export type TemplateResult = {
  ok: boolean;
  output?: string;
  response?: any;
  error?: string;
  nextTemplateResult?: TemplateResult;
};

export const TemplateResultSchema: z.ZodType<TemplateResult> = z.object({
  ok: z.boolean(),
  output: z.string().optional(),
  response: z.any().optional(),
  error: z.string().optional(),
  nextTemplateResult: z.lazy(() => TemplateResultSchema).optional(),
});

export type TemplateChatRequest = z.infer<typeof TemplateChatRequestSchema>;
export type TemplateFunction = (input: string) => Promise<TemplateChatRequest>;

export type TemplateServiceOptions = Record<string, TemplateFunction>;

/**
 * Registry for prompt templates
 * Stores and manages template functions that can be used to generate chat requests
 */
export default class TemplateService implements TokenRingService {
  readonly name = "TemplateService";
  description = "Provides a registry of prompt templates";

  /**
   * Map of template names to template functions
   */
  templates = new KeyedRegistry<TemplateFunction>();
  getTemplateByName = this.templates.getItemByName;
  listTemplates = this.templates.getAllItemNames;


  constructor(templates: TemplateServiceOptions) {
    this.templates.registerAll(templates);
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

    const template = this.templates.getItemByName(templateName);

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }


    const chatService = agent.requireServiceByType(ChatService);

    // Store original tool state for restoration
    let originalTools: string[] | null = null;
    let toolsChanged = false;

    try {
      // Execute the template function with the input
      const chatRequest = await template(input);

      // Check if the template wants to reset context
      if (chatRequest.reset) {
        agent.infoMessage(`Resetting ${chatRequest.reset.join(",")} context for template: ${templateName}`);
        agent.reset(chatRequest.reset);
      }

      // Handle activeTools option - save current tools and set new ones
      if (chatRequest.activeTools && Array.isArray(chatRequest.activeTools)) {
        originalTools = chatService.getEnabledTools(agent);

        chatService.setEnabledTools(chatRequest.activeTools, agent);

        toolsChanged = true;
        agent.infoMessage(
          `Set active tools for template: ${chatRequest.activeTools.join(", ")}`,
        );
      }


      const chatConfig = chatService.getChatConfig(agent);

      let lastResult: AIResponse | null = null

      for (const input of chatRequest.inputs ?? []) {
        // Run the chat with the generated request
        lastResult = await runChat(input, chatConfig, agent);

        agent.infoMessage(`Input Complete:\n${getChatAnalytics(lastResult)}`);

        if (lastResult.finishReason !== "stop") {
          throw new Error(`AI Chat did not stop as expected, Reason: ${ lastResult.finishReason }`);
        }
      }


      // Prepare the result object
      const result: TemplateResult = {
        ok: true,
        output: lastResult?.text ?? "No output from AI."
      };

      // Check if the template wants to run another template next
      if (chatRequest.nextTemplate) {
        // Prevent circular references
        if (visitedTemplates.includes(chatRequest.nextTemplate)) {
          throw new Error(`Circular template reference detected: ${chatRequest.nextTemplate} has already been run in this chain.`);
        }

        // Log that we're running the next template
        agent.infoMessage(
          `Running next template: ${chatRequest.nextTemplate}`,
        );

        // Run the next template with the output of this template as input
        const nextTemplateResult = await this.runTemplate(
          {
            templateName: chatRequest.nextTemplate,
            input: lastResult?.text ?? "No output from AI.",
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
        const chatService = agent.requireServiceByType(ChatService);
        chatService.setEnabledTools(originalTools, agent);
        agent.infoMessage(
          `Restored original tools: ${originalTools.join(", ") || "none"}`,
        );
      }
    }
  }
}
