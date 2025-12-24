import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Agent } from '@tokenring-ai/agent';
import TemplateService from '../TemplateService';
import listTemplates from '../tools/listTemplates';
import runTemplate from '../tools/runTemplate';
import templateCommand from '../commands/template';
import runChat from '@tokenring-ai/chat/runChat';

vi.mock('@tokenring-ai/chat/runChat', () => ({
  default: vi.fn(),
}));

describe('Template Integration Tests', () => {
  let mockAgent: Partial<Agent>;
  let mockChatService: any;
  let mockTemplateService: TemplateService;
  let mockRunChat: ReturnType<typeof vi.fn>;

  const setupMockTemplates = () => ({
    'simple-template': async (input: string) => ({
      inputs: [input],
      nextTemplate: undefined,
      reset: undefined,
      activeTools: undefined,
    }),
    'complex-template': async (input: string) => ({
      inputs: [input, `Processed: ${input}`],
      nextTemplate: 'final-template',
      reset: undefined,
      activeTools: undefined,
    }),
    'final-template': async (input: string) => ({
      inputs: [input],
      nextTemplate: undefined,
      reset: undefined,
      activeTools: undefined,
    }),
    'error-template': async (input: string) => {
      throw new Error('Template execution error');
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const templates = setupMockTemplates();
    mockTemplateService = new TemplateService(templates);

    mockChatService = {
      getChatConfig: vi.fn(() => ({})),
      getEnabledTools: vi.fn(() => ['default-tool']),
      setEnabledTools: vi.fn(),
    };

    vi.mocked(runChat).mockResolvedValue(['Integration test output', { 
      response: 'Integration response',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      timing: { duration: 100 },
      cost: { input: 0.01, cachedInput: 0, output: 0.02, reasoning: 0, total: 0.03 }
    }]);

    mockAgent = {
      requireServiceByType: vi.fn((serviceType) => {
        if (serviceType === TemplateService) return mockTemplateService;
        if (serviceType.name === 'ChatService') return mockChatService;
        throw new Error(`Unknown service type: ${serviceType?.name}`);
      }),
      systemMessage: vi.fn(),
      infoLine: vi.fn(),
      reset: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Template Execution', () => {
    it('should execute a simple template end-to-end', async () => {
      const result = await mockTemplateService.runTemplate({
        templateName: 'simple-template',
        input: 'Test input',
      }, mockAgent as Agent);

      expect(result.ok).toBe(true);
      expect(result.output).toBe('Integration test output');
      expect(result.response).toBeDefined();

      expect(mockChatService.getChatConfig).toHaveBeenCalledWith(mockAgent);
      expect(runChat).toHaveBeenCalledWith('Test input', {}, mockAgent);
    });

    it('should handle template chaining end-to-end', async () => {
      const result = await mockTemplateService.runTemplate({
        templateName: 'complex-template',
        input: 'Initial input',
      }, mockAgent as Agent);

      expect(result.ok).toBe(true);
      expect(result.nextTemplateResult).toBeDefined();
      expect(result.nextTemplateResult?.ok).toBe(true);

      expect(runChat).toHaveBeenCalledTimes(3);
      expect(runChat).toHaveBeenNthCalledWith(1, 'Initial input', {}, mockAgent);
      expect(runChat).toHaveBeenNthCalledWith(2, 'Processed: Initial input', {}, mockAgent);
      expect(runChat).toHaveBeenNthCalledWith(3, 'Integration test output', {}, mockAgent);
    });

    it('should handle template errors gracefully', async () => {
      await expect(
        mockTemplateService.runTemplate({
          templateName: 'error-template',
          input: 'Test input',
        }, mockAgent as Agent)
      ).rejects.toThrow('Template execution error');
    });
  });

  describe('Tool Integration', () => {
    it('should integrate listTemplates tool with service', async () => {
      vi.mocked(mockAgent.requireServiceByType).mockReturnValue(mockTemplateService);

      const result = await listTemplates.execute({}, mockAgent as Agent);

      expect(result.ok).toBe(true);
      expect(result.templates).toContain('simple-template');
      expect(result.templates).toContain('complex-template');
      expect(result.templates).toContain('final-template');
    });

    it('should integrate runTemplate tool with service', async () => {
      mockAgent.requireServiceByType = vi.fn((serviceType) => {
        if (serviceType === TemplateService) return mockTemplateService;
        if (serviceType.name === 'ChatService') return mockChatService;
        throw new Error(`Unknown service type`);
      });

      await runTemplate.execute({
        templateName: 'simple-template',
        input: 'Tool test input',
      }, mockAgent as Agent);

      expect(mockAgent.infoLine).toHaveBeenCalledWith('[template_run] Running template: simple-template');
      expect(runChat).toHaveBeenCalledWith('Tool test input', {}, mockAgent);
    });

    it('should handle tool errors consistently', async () => {
      vi.mocked(mockAgent.requireServiceByType).mockReturnValue(mockTemplateService);

      await expect(
        runTemplate.execute({
          templateName: 'non-existent',
          input: 'Test input',
        }, mockAgent as Agent)
      ).rejects.toThrow('Template not found: non-existent');
    });
  });

  describe('Command Integration', () => {
    it('should integrate commands with the service', async () => {
      vi.mocked(mockAgent.requireServiceByType).mockReturnValue(mockTemplateService);

      // Test list command
      await templateCommand.execute('list', mockAgent as Agent);
      
      // Verify the command was processed (systemMessage would be called)
      expect(mockAgent.systemMessage).toHaveBeenCalled();
    });

    it('should integrate run commands with the service', async () => {
      mockAgent.requireServiceByType = vi.fn((serviceType) => {
        if (serviceType === TemplateService) return mockTemplateService;
        if (serviceType.name === 'ChatService') return mockChatService;
        throw new Error(`Unknown service type`);
      });

      await templateCommand.execute('run simple-template command input', mockAgent as Agent);

      expect(runChat).toHaveBeenCalledWith('command input', {}, mockAgent);
    });

    it('should handle command errors gracefully', async () => {
      mockAgent.requireServiceByType = vi.fn((serviceType) => {
        if (serviceType === TemplateService) return mockTemplateService;
        if (serviceType.name === 'ChatService') return mockChatService;
        throw new Error(`Unknown service type`);
      });

      await expect(
        templateCommand.execute('run non-existent-template input', mockAgent as Agent)
      ).rejects.toThrow('Template not found: non-existent-template');
    });
  });

  describe('Context Management Integration', () => {
    it('should manage tools context across template execution', async () => {
      const templatesWithTools = {
        'tools-test': async (input: string) => ({
          inputs: [input],
          nextTemplate: undefined,
          reset: undefined,
          activeTools: ['tool1', 'tool2', 'tool3'],
        }),
      };

      const serviceWithTools = new TemplateService(templatesWithTools);

      await serviceWithTools.runTemplate({
        templateName: 'tools-test',
        input: 'Context test input',
      }, mockAgent as Agent);

      // Verify tools were set
      expect(mockChatService.setEnabledTools).toHaveBeenCalledWith(['tool1', 'tool2', 'tool3'], mockAgent);
      
      // Verify tools were restored
      expect(mockChatService.setEnabledTools).toHaveBeenCalledWith(['default-tool'], mockAgent);
    });

    it('should handle context reset integration', async () => {
      const templatesWithReset = {
        'reset-test': async (input: string) => ({
          inputs: [input],
          nextTemplate: undefined,
          reset: ['memory', 'context'] as any,
          activeTools: undefined,
        }),
      };

      const serviceWithReset = new TemplateService(templatesWithReset);

      await serviceWithReset.runTemplate({
        templateName: 'reset-test',
        input: 'Reset test input',
      }, mockAgent as Agent);

      expect(mockAgent.systemMessage).toHaveBeenCalledWith(
        expect.stringContaining('Resetting memory,context context for template: reset-test')
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle partial failures gracefully', async () => {
      vi.mocked(runChat)
        .mockResolvedValueOnce(['First output', { 
          response: 'First response',
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          timing: { duration: 100 },
          cost: { input: 0.01, cachedInput: 0, output: 0.02, reasoning: 0, total: 0.03 }
        }])
        .mockRejectedValueOnce(new Error('Second call failed'));

      await expect(
        mockTemplateService.runTemplate({
          templateName: 'complex-template',
          input: 'Test input',
        }, mockAgent as Agent)
      ).rejects.toThrow('Second call failed');

      expect(runChat).toHaveBeenCalledTimes(2);
    });

    it('should maintain service state after errors', async () => {
      vi.mocked(runChat).mockClear();
      vi.mocked(runChat).mockRejectedValueOnce(new Error('Test error'));

      await expect(
        mockTemplateService.runTemplate({
          templateName: 'simple-template',
          input: 'Test input',
        }, mockAgent as Agent)
      ).rejects.toThrow('Test error');

      const templates = mockTemplateService.listTemplates();
      expect(templates).toContain('simple-template');
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent template execution', async () => {
      const promises = [
        mockTemplateService.runTemplate({
          templateName: 'simple-template',
          input: 'Concurrent input 1',
        }, mockAgent as Agent),
        mockTemplateService.runTemplate({
          templateName: 'simple-template',
          input: 'Concurrent input 2',
        }, mockAgent as Agent),
      ];

      const results = await Promise.all(promises);

      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);
      expect(results[0].output).toBe('Integration test output');
      expect(results[1].output).toBe('Integration test output');
    });
  });
});