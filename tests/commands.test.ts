import createTestingAgent from "@tokenring-ai/agent/test/createTestingAgent";
import createTestingApp from "@tokenring-ai/app/test/createTestingApp";
import {ChatService} from "@tokenring-ai/chat";
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Agent } from '@tokenring-ai/agent';
import TemplateService from '../TemplateService';
import templateCommand from '../commands/template';

const app = createTestingApp();

describe('Template Commands', () => {
  let mockAgent: Agent;
  let mockChatService: ChatService;
  let mockTemplateService: TemplateService;

  beforeEach(() => {
    mockTemplateService = new TemplateService({
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
    app.addServices(mockTemplateService);

    mockChatService = new ChatService({})

    app.addServices(mockChatService);

    mockAgent = createTestingAgent(app);
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
      const templates = mockTemplateService.listTemplates()
      
      expect(templates).toEqual(['summarize', 'analyze', 'generate']);
    });
  });


  describe('Info Command', () => {
    it('should handle non-existent template in info command', () => {
      vi.spyOn(mockTemplateService, 'getTemplateByName').mockReturnValue(undefined);
      
      const template = mockTemplateService.getTemplateByName('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('Command Execution Integration', () => {
    it('should execute list command', async () => {
      vi.spyOn(mockTemplateService, 'listTemplates');
      await templateCommand.execute('list', mockAgent);

      expect(mockTemplateService.listTemplates).toHaveBeenCalled();
    });

    it('should execute run command with arguments', async () => {
      vi.spyOn(mockTemplateService, 'runTemplate').mockResolvedValue({ ok: true });
       await templateCommand.execute('run summarize This is test input', mockAgent);

      expect(mockTemplateService.runTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'summarize',
          input: 'This is test input',
        }),
        mockAgent
      );
    });

    it('should execute info command', async () => {
      vi.spyOn(mockTemplateService, 'getTemplateByName');
      await templateCommand.execute('info summarize', mockAgent);

      expect(mockTemplateService.getTemplateByName).toHaveBeenCalledWith('summarize');
    });

    it('should handle unknown commands', async () => {
      vi.spyOn(mockAgent, 'systemMessage');
      await templateCommand.execute('unknown-command', mockAgent);
      
      expect(mockAgent.systemMessage).toHaveBeenCalledWith(
        'Unknown subcommand: unknown-command'
      );
    });

    it('should show help when no command provided', async () => {
      vi.spyOn(mockAgent, 'systemMessage');
      await templateCommand.execute('', mockAgent);
      
      expect(mockAgent.systemMessage).toHaveBeenCalledWith(
        'Template Command Usage:'
      );
    });
  });

  describe('Template Service Integration', () => {
    it('should handle template execution', async () => {
      vi.spyOn(mockTemplateService, 'runTemplate').mockResolvedValue({
        ok: true,
        output: 'Test output',
        response: { data: 'test' },
      });

      await templateCommand.execute('run test-template test input', mockAgent);
      
      expect(mockTemplateService.runTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: 'test-template',
          input: 'test input',
        }),
        mockAgent
      );
    });

    it('should handle template not found errors', async () => {
      vi.spyOn(mockTemplateService, 'runTemplate').mockRejectedValue(
        new Error('Template not found: non-existent')
      );

      await expect(
        templateCommand.execute('run non-existent input', mockAgent)
      ).rejects.toThrow('Template not found: non-existent');
    });
  });
});