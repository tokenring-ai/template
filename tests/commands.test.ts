import {Agent} from '@tokenring-ai/agent';
import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import {ChatModelRegistry} from "@tokenring-ai/ai-client/ModelRegistry";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {ChatService} from "@tokenring-ai/chat";
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import listCommand from '../commands/template/list.ts';
import infoCommand from '../commands/template/info.ts';
import runCommand from '../commands/template/run.ts';
import TemplateService from '../TemplateService.ts';

const chatModelRegistry = new ChatModelRegistry();

describe('Template Commands', () => {
  let agent: Agent;
  let chatService: ChatService;
  let templateService: TemplateService;
  let app: TokenRingApp;

  beforeEach(() => {
    app = createTestingApp()
    
    templateService = new TemplateService({
      summarize: async (input) => ({
        inputs: [`/help`],
        nextTemplate: undefined,
        activeTools: undefined,
      }),
      analyze: async (input) => ({
        inputs: [input],
        nextTemplate: undefined,
        activeTools: undefined,
      }),
      generate: async (input) => ({
        inputs: [input],
        nextTemplate: undefined,
        activeTools: undefined,
      }),
    });
    app.addServices(templateService);

    chatService = new ChatService(app,{
      defaultModels: [],
      agentDefaults: {
        model: 'auto',
        autoCompact: true,
        enabledTools: [],
        maxSteps: 30,
        context: {
          initial: [],
          followUp: []
        }
      }
    });
    app.addServices(chatService);
    app.addServices(chatModelRegistry);

    agent = createTestingAgent(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should have correct command definitions', () => {
      expect(listCommand.name).toBe('template list');
      expect(listCommand.description).toBe('List available templates');
      expect(listCommand.execute).toBeDefined();

      expect(infoCommand.name).toBe('template info');
      expect(infoCommand.description).toBe('Show info about a template');
      expect(infoCommand.execute).toBeDefined();

      expect(runCommand.name).toBe('template run');
      expect(runCommand.description).toBe('Run a template');
      expect(runCommand.execute).toBeDefined();
    });

    it('should have correct help text', () => {
      expect(listCommand.help).toContain('List all available templates');
      expect(infoCommand.help).toContain('Show information about a specific template');
      expect(runCommand.help).toContain('Run a template with optional input text');
    });
  });

  describe('List Command', () => {
    it('should list all templates when there are templates', async () => {
      const result = await listCommand.execute({agent} as any);
      
      expect(result).toContain('Available templates');
      expect(result).toContain('summarize');
      expect(result).toContain('analyze');
      expect(result).toContain('generate');
    });

    it('should return message when no templates available', async () => {
      const emptyService = new TemplateService({});
      app.addServices(emptyService);
      const emptyAgent = createTestingAgent(app);
      
      const result = await listCommand.execute({agent: emptyAgent} as any);
      
      expect(result).toBe('No templates available.');
    });
  });

  describe('Info Command', () => {
    it('should show info for existing template', async () => {
      const result = await infoCommand.execute({
        positionals: { templateName: 'summarize' },
        agent
      }, agent);
      
      expect(result).toContain('Template: summarize');
      expect(result).toContain('/template run summarize');
    });

    it('should handle non-existent template', async () => {
      const result = await infoCommand.execute({
        positionals: { templateName: 'non-existent' },
        agent
      }, agent);
      
      expect(result).toBe('Template not found: non-existent');
    });
  });

  describe('Run Command', () => {
    it('should execute run command with arguments', async () => {
      vi.spyOn(templateService, 'runTemplate').mockResolvedValue({ ok: true });
      
      const result = await runCommand.execute({
        positionals: { templateName: 'summarize' },
        remainder: 'This is test input',
        agent
      }, agent);

      expect(templateService.runTemplate).toHaveBeenCalledWith(
        {
          templateName: 'summarize',
          input: 'This is test input',
        },
        agent
      );
      expect(result).toBe('Template executed');
    });

    it('should handle empty remainder', async () => {
      vi.spyOn(templateService, 'runTemplate').mockResolvedValue({ ok: true });
      
      await runCommand.execute({
        positionals: { templateName: 'analyze' },
        remainder: undefined,
        agent
      }, agent);

      expect(templateService.runTemplate).toHaveBeenCalledWith(
        {
          templateName: 'analyze',
          input: '',
        },
        agent
      );
    });
  });

  describe('Template Service Integration', () => {
    it('should handle template execution', async () => {
      vi.spyOn(templateService, 'runTemplate').mockResolvedValue({
        ok: true,
        output: 'Test output',
        response: { data: 'test' },
      });

      await runCommand.execute({
        positionals: { templateName: 'test-template' },
        remainder: 'test input',
        agent
      }, agent);
      
      expect(templateService.runTemplate).toHaveBeenCalledWith(
        {
          templateName: 'test-template',
          input: 'test input',
        },
        agent
      );
    });

    it('should handle template not found errors', async () => {
      vi.spyOn(templateService, 'runTemplate').mockRejectedValue(
        new Error('Template not found: non-existent')
      );

      await expect(
        runCommand.execute({
          positionals: { templateName: 'non-existent' },
          remainder: 'input',
          agent
        }, agent)
      ).rejects.toThrow('Template not found: non-existent');
    });
  });
});
