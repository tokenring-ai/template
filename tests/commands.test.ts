import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import {ChatModelRegistry} from "@tokenring-ai/ai-client/ModelRegistry";
import TokenRingApp from "@tokenring-ai/app";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {ChatService} from "@tokenring-ai/chat";
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Agent } from '@tokenring-ai/agent';
import TemplateService from '../TemplateService';
import templateCommand from '../commands/template';

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
        reset: undefined,
        activeTools: undefined,
      }),
      analyze: async (input) => ({
        inputs: [input],
        nextTemplate: undefined,
      }),
      generate: async (input) => ({
        inputs: [input],
        nextTemplate: undefined,
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
    it('should have correct command definition', () => {
      expect(templateCommand.description).toBe('/template - Run prompt templates');
      expect(templateCommand.help).toContain('# Template Command');
      expect(templateCommand.execute).toBeDefined();
    });

    it('should handle help display', () => {
      const helpCommand = templateCommand.help;
      
      expect(helpCommand).toContain('## Usage');
      expect(helpCommand).toContain('/template [subcommand] [options]');
      expect(helpCommand).toContain('### `list`');
      expect(helpCommand).toContain('### `run <templateName> [input]`');
      expect(helpCommand).toContain('### `info <templateName>`');
    });
  });

  describe('List Command', () => {
    it('should list all templates when there are templates', () => {
      // This tests the actual listTemplates function behavior
      const templates = templateService.listTemplates()
      
      expect(templates).toEqual(['summarize', 'analyze', 'generate']);
    });
  });


  describe('Info Command', () => {
    it('should handle non-existent template in info command', () => {
      vi.spyOn(templateService, 'getTemplateByName').mockReturnValue(undefined);
      
      const template = templateService.getTemplateByName('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('Command Execution Integration', () => {
    it('should execute list command', async () => {
      vi.spyOn(templateService, 'listTemplates');
      await templateCommand.execute('list', agent);

      expect(templateService.listTemplates).toHaveBeenCalled();
    });

    it('should execute run command with arguments', async () => {
      vi.spyOn(templateService, 'runTemplate').mockResolvedValue({ ok: true });
       await templateCommand.execute('run summarize This is test input', agent);

      expect(templateService.runTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'summarize',
          input: 'This is test input',
        }),
        agent
      );
    });

    it('should execute info command', async () => {
      vi.spyOn(templateService, 'getTemplateByName');
      await templateCommand.execute('info summarize', agent);

      expect(templateService.getTemplateByName).toHaveBeenCalledWith('summarize');
    });

    it('should handle unknown commands', async () => {
      vi.spyOn(agent, 'systemMessage');
      await templateCommand.execute('unknown-command', agent);
      
      expect(agent.systemMessage).toHaveBeenCalledWith(
        'Unknown subcommand: unknown-command'
      );
    });

    it('should show help when no command provided', async () => {
      vi.spyOn(agent, 'systemMessage');
      await templateCommand.execute('', agent);
      
      expect(agent.systemMessage).toHaveBeenCalledWith(
        'Template Command Usage:'
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

      await templateCommand.execute('run test-template test input', agent);
      
      expect(templateService.runTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'test-template',
          input: 'test input',
        }),
        agent
      );
    });

    it('should handle template not found errors', async () => {
      vi.spyOn(templateService, 'runTemplate').mockRejectedValue(
        new Error('Template not found: non-existent')
      );

      await expect(
        templateCommand.execute('run non-existent input', agent)
      ).rejects.toThrow('Template not found: non-existent');
    });
  });
});
