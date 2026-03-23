import {Agent} from '@tokenring-ai/agent';
import createTestingAgent from '@tokenring-ai/agent/test/createTestingAgent';
import createTestingApp from '@tokenring-ai/app/test/createTestingApp';
import {ChatService} from '@tokenring-ai/chat';
import runChat from '@tokenring-ai/chat/runChat';
import {ChatModelRegistry} from '@tokenring-ai/ai-client/ModelRegistry';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import listCommand from '../commands/template/list.js';
import infoCommand from '../commands/template/info.js';
import runCommand from '../commands/template/run.js';
import TemplateService, {type TemplateResult} from '../TemplateService.js';
import listTemplates from '../tools/listTemplates.js';
import runTemplate from '../tools/runTemplate.js';

vi.mock('@tokenring-ai/chat/runChat', () => ({
  default: vi.fn(),
}));

const chatModelRegistry = new ChatModelRegistry();

// Helper to create mock chat response
const createMockResponse = (text = 'Test output'): any => ({
  text,
  finishReason: 'stop',
  usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  totalUsage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 20, totalTokens: 30 },
});

describe('Template Integration Tests', () => {
  let mockAgent: Agent;
  let mockChatService: ChatService;
  let mockTemplateService: TemplateService;
  let mockApp: any;
  let mockRunChat: ReturnType<typeof vi.fn>;

  const setupMockTemplates = () => ({
    'simple-template': async (input: string) => ({
      inputs: [input],
      nextTemplate: undefined,
      activeTools: undefined,
    }),
    'complex-template': async (input: string) => ({
      inputs: [input, `Processed: ${input}`],
      nextTemplate: 'final-template',
      activeTools: undefined,
    }),
    'final-template': async (input: string) => ({
      inputs: [input],
      nextTemplate: undefined,
      activeTools: undefined,
    }),
    'error-template': async (input: string) => {
      throw new Error('Template execution error');
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRunChat = vi.mocked(runChat);
    
    const mockTemplates = setupMockTemplates();
    mockTemplateService = new TemplateService(mockTemplates);

    mockApp = createTestingApp();
    mockApp.addServices(mockTemplateService);

    mockChatService = new ChatService(mockApp, {
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
    mockApp.addServices(mockChatService);
    mockApp.addServices(chatModelRegistry);

    mockAgent = createTestingAgent(mockApp);

    vi.mocked(runChat).mockResolvedValue(createMockResponse('Integration test output'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Template Execution', () => {
    it('should execute a simple template end-to-end', async () => {
      // Mock the ChatService methods that TemplateService needs
      const mockGetChatConfig = vi.fn().mockReturnValue({
        context: { initial: [], followUp: [] }
      });
      const mockInfoMessage = vi.fn();
      
      vi.spyOn(mockChatService, 'getChatConfig').mockImplementation(mockGetChatConfig);
      vi.spyOn(mockAgent, 'infoMessage').mockImplementation(mockInfoMessage);

      const result = await mockTemplateService.runTemplate({
        templateName: 'simple-template',
        input: 'Test input',
      }, mockAgent);

      expect(result.ok).toBe(true);
      expect(result.output).toBe('Integration test output');
      
      expect(runChat).toHaveBeenCalledWith({
        input: 'Test input',
        chatConfig: expect.any(Object),
        agent: mockAgent
      });
    });

    it('should handle template chaining end-to-end', async () => {
      const mockGetChatConfig = vi.fn().mockReturnValue({
        context: { initial: [], followUp: [] }
      });
      const mockInfoMessage = vi.fn();
      
      vi.spyOn(mockChatService, 'getChatConfig').mockImplementation(mockGetChatConfig);
      vi.spyOn(mockAgent, 'infoMessage').mockImplementation(mockInfoMessage);

      const result = await mockTemplateService.runTemplate({
        templateName: 'complex-template',
        input: 'Initial input',
      }, mockAgent);

      expect(result.ok).toBe(true);
      expect(result.nextTemplateResult).toBeDefined();
      expect(result.nextTemplateResult?.ok).toBe(true);

      expect(runChat).toHaveBeenCalledTimes(3);
    });

    it('should handle template errors gracefully', async () => {
      const mockInfoMessage = vi.fn();
      vi.spyOn(mockAgent, 'infoMessage').mockImplementation(mockInfoMessage);

      await expect(
        mockTemplateService.runTemplate({
          templateName: 'error-template',
          input: 'Test input',
        }, mockAgent)
      ).rejects.toThrow('Template execution error');
    });
  });

  describe('Tool Integration', () => {
    it('should integrate listTemplates tool with service', async () => {
      const result = await listTemplates.execute({}, mockAgent);

      expect(result.type).toBe('json');
      expect(result.data.templates).toContain('simple-template');
      expect(result.data.templates).toContain('complex-template');
      expect(result.data.templates).toContain('final-template');
    });

    it('should integrate runTemplate tool with service', async () => {
      const mockGetChatConfig = vi.fn().mockReturnValue({
        context: { initial: [], followUp: [] }
      });
      const mockInfoMessage = vi.fn();
      
      vi.spyOn(mockChatService, 'getChatConfig').mockImplementation(mockGetChatConfig);
      vi.spyOn(mockAgent, 'infoMessage').mockImplementation(mockInfoMessage);
      
      vi.mocked(runChat).mockResolvedValueOnce(createMockResponse('Tool test output'));

      const result = await runTemplate.execute({
        templateName: 'simple-template',
        input: 'Tool test input',
      }, mockAgent);

      expect(result.type).toBe('json');
      expect(result.data.output).toBe('Tool test output');
    });

    it('should handle tool errors consistently', async () => {
      await expect(
        runTemplate.execute({
          templateName: 'non-existent',
          input: 'Test input',
        }, mockAgent)
      ).rejects.toThrow('Template not found: non-existent');
    });
  });

  describe('Command Integration', () => {
    it('should integrate list command with the service', async () => {
      const result = await listCommand.execute({agent: mockAgent} as any);
      
      expect(result).toContain('Available templates');
      expect(result).toContain('simple-template');
    });

    it('should integrate run command with the service', async () => {
      const mockGetChatConfig = vi.fn().mockReturnValue({
        context: { initial: [], followUp: [] }
      });
      const mockInfoMessage = vi.fn();
      
      vi.spyOn(mockChatService, 'getChatConfig').mockImplementation(mockGetChatConfig);
      vi.spyOn(mockAgent, 'infoMessage').mockImplementation(mockInfoMessage);
      
      vi.mocked(runChat).mockResolvedValueOnce(createMockResponse('Command test output'));

      const result = await runCommand.execute({
        positionals: { templateName: 'simple-template' },
        remainder: 'command input',
        agent: mockAgent
      }, mockAgent);

      expect(result).toBe('Template executed');
      expect(runChat).toHaveBeenCalledWith({
        input: 'command input',
        chatConfig: expect.any(Object),
        agent: mockAgent
      });
    });

    it('should integrate info command with the service', async () => {
      const result = await infoCommand.execute({
        positionals: { templateName: 'simple-template' },
        agent: mockAgent
      }, mockAgent);

      expect(result).toContain('Template: simple-template');
    });

    it('should handle command errors gracefully', async () => {
      await expect(
        runCommand.execute({
          positionals: { templateName: 'non-existent-template' },
          remainder: 'input',
          agent: mockAgent
        }, mockAgent)
      ).rejects.toThrow('Template not found: non-existent-template');
    });
  });

  describe('Context Management Integration', () => {
    it('should manage tools context across template execution', async () => {
      const templatesWithTools = {
        'tools-test': async (input: string) => ({
          inputs: [input],
          nextTemplate: undefined,
          activeTools: ['tool1', 'tool2', 'tool3'],
        }),
      };

      const serviceWithTools = new TemplateService(templatesWithTools);
      const testApp = createTestingApp();
      testApp.addServices(serviceWithTools);
      
      const mockChatServiceWithTools = new ChatService(testApp, {
        defaultModels: [],
        agentDefaults: {
          model: 'auto',
          autoCompact: true,
          enabledTools: ['default-tool'],
          maxSteps: 30,
          context: {
            initial: [],
            followUp: []
          }
        }
      });
      testApp.addServices(mockChatServiceWithTools);
      testApp.addServices(chatModelRegistry);

      const testAgent = createTestingAgent(testApp);
      
      // Mock the ChatService methods
      const mockEnabledTools = ['default-tool'];
      vi.spyOn(mockChatServiceWithTools, 'getEnabledTools').mockReturnValue(mockEnabledTools);
      vi.spyOn(mockChatServiceWithTools, 'setEnabledTools').mockImplementation(() => {});
      vi.spyOn(mockChatServiceWithTools, 'getChatConfig').mockReturnValue({
        context: { initial: [], followUp: [] }
      });
      vi.spyOn(testAgent, 'infoMessage').mockImplementation(() => {});

      vi.mocked(runChat).mockResolvedValueOnce(createMockResponse('Tools test output'));

      await serviceWithTools.runTemplate({
        templateName: 'tools-test',
        input: 'Context test input',
      }, testAgent);

      // Verify tools were set and restored
      expect(mockChatServiceWithTools.setEnabledTools).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle partial failures gracefully', async () => {
      const mockGetChatConfig = vi.fn().mockReturnValue({
        context: { initial: [], followUp: [] }
      });
      const mockInfoMessage = vi.fn();
      
      vi.spyOn(mockChatService, 'getChatConfig').mockImplementation(mockGetChatConfig);
      vi.spyOn(mockAgent, 'infoMessage').mockImplementation(mockInfoMessage);
      
      vi.mocked(runChat)
        .mockResolvedValueOnce(createMockResponse('First output'))
        .mockRejectedValueOnce(new Error('Second call failed'));

      await expect(
        mockTemplateService.runTemplate({
          templateName: 'complex-template',
          input: 'Test input',
        }, mockAgent)
      ).rejects.toThrow('Second call failed');

      expect(runChat).toHaveBeenCalledTimes(2);
    });

    it('should maintain service state after errors', async () => {
      const mockGetChatConfig = vi.fn().mockReturnValue({
        context: { initial: [], followUp: [] }
      });
      const mockInfoMessage = vi.fn();
      
      vi.spyOn(mockChatService, 'getChatConfig').mockImplementation(mockGetChatConfig);
      vi.spyOn(mockAgent, 'infoMessage').mockImplementation(mockInfoMessage);
      
      vi.mocked(runChat).mockClear();
      vi.mocked(runChat).mockRejectedValueOnce(new Error('Test error'));

      await expect(
        mockTemplateService.runTemplate({
          templateName: 'simple-template',
          input: 'Test input',
        }, mockAgent)
      ).rejects.toThrow('Test error');

      const templates = mockTemplateService.listTemplates();
      expect(templates).toContain('simple-template');
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent template execution', async () => {
      const mockGetChatConfig = vi.fn().mockReturnValue({
        context: { initial: [], followUp: [] }
      });
      const mockInfoMessage = vi.fn();
      
      vi.spyOn(mockChatService, 'getChatConfig').mockImplementation(mockGetChatConfig);
      vi.spyOn(mockAgent, 'infoMessage').mockImplementation(mockInfoMessage);
      
      vi.mocked(runChat).mockResolvedValue(createMockResponse('Concurrent output'));

      const promises: Array<Promise<TemplateResult>> = [
        mockTemplateService.runTemplate({
          templateName: 'simple-template',
          input: 'Concurrent input 1',
        }, mockAgent),
        mockTemplateService.runTemplate({
          templateName: 'simple-template',
          input: 'Concurrent input 2',
        }, mockAgent),
      ];

      const results = await Promise.all(promises);

      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);
      expect(results[0].output).toBe('Concurrent output');
      expect(results[1].output).toBe('Concurrent output');
    });
  });
});
