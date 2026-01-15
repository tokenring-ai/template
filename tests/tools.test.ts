import {beforeEach, describe, expect, it, vi} from 'vitest';
// Import after mocking
import listTemplates from '../tools/listTemplates';
import runTemplate from '../tools/runTemplate';

// Mock the module dependencies to avoid import errors
vi.mock('@tokenring-ai/agent');
vi.mock('@tokenring-ai/chat/types');

describe('Template Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTemplates Tool', () => {
    it('should have correct tool definition', () => {
      expect(listTemplates.name).toBe('template_list');
      expect(listTemplates.description).toContain('Lists all available templates');
      expect(typeof listTemplates.execute).toBe('function');
      expect(listTemplates.inputSchema).toBeDefined();
    });

    it('should validate input schema correctly', () => {
      const schema = listTemplates.inputSchema;
      expect(schema).toBeDefined();
      
      // Should parse empty object
      const parsed = schema.parse({});
      expect(parsed).toEqual({});
    });
  });

  describe('runTemplate Tool', () => {
    it('should have correct tool definition', () => {
      expect(runTemplate.name).toBe('template_run');
      expect(runTemplate.description).toContain('Run a template with the given input');
      expect(typeof runTemplate.execute).toBe('function');
      expect(runTemplate.inputSchema).toBeDefined();
    });

    it('should validate input schema correctly', () => {
      const schema = runTemplate.inputSchema;
      
      // Should parse valid input
      const parsed = schema.parse({
        templateName: 'test-template',
        input: 'Test input',
      });
      expect(parsed).toEqual({
        templateName: 'test-template',
        input: 'Test input',
      });

      // Should reject missing required fields
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ templateName: 'test' })).toThrow();
      expect(() => schema.parse({ input: 'test' })).toThrow();
    });
  });

  describe('Tool Integration', () => {
    it('should export tools correctly', () => {
      const tools = {
        runTemplate,
        listTemplates,
      };

      expect(tools.runTemplate).toBeDefined();
      expect(tools.listTemplates).toBeDefined();
    });
  });
});