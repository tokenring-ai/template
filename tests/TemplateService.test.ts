import { describe, it, expect, beforeEach } from 'vitest';
import TemplateService from '../TemplateService';

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    // Mock template functions
    const mockTemplates = {
      'test-template': async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
        reset: undefined,
        activeTools: undefined,
      }),
      'chained-template': async (input: string) => ({
        inputs: [input],
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
      'reset-template': async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
        reset: ['memory' as any],
        activeTools: undefined,
      }),
      'tools-template': async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
        reset: undefined,
        activeTools: ['tool1', 'tool2'],
      }),
    };

    templateService = new TemplateService(mockTemplates);
  });

  describe('Template Registration', () => {
    it('should register templates correctly', () => {
      expect(templateService.getTemplateByName('test-template')).toBeDefined();
      expect(templateService.getTemplateByName('non-existent')).toBeUndefined();
    });

    it('should list all templates', () => {
      const templates = templateService.listTemplates();
      expect(templates).toContain('test-template');
      expect(templates).toContain('chained-template');
      expect(templates).toContain('final-template');
    });
  });

  describe('Template Service Properties', () => {
    it('should have correct service name and description', () => {
      expect(templateService.name).toBe('TemplateService');
      expect(templateService.description).toBe('Provides a registry of prompt templates');
    });
  });

  describe('Template Function Types', () => {
    it('should accept template functions with correct signature', () => {
      const validTemplate = async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
        reset: undefined,
        activeTools: undefined,
      });

      const testService = new TemplateService({ 'valid': validTemplate });
      expect(testService.getTemplateByName('valid')).toBeDefined();
    });

    it('should handle templates with nextTemplate', () => {
      const templateWithChaining = async (input: string) => ({
        inputs: [input],
        nextTemplate: 'test-template',
        reset: undefined,
        activeTools: undefined,
      });

      const testService = new TemplateService({ 'chainable': templateWithChaining });
      expect(testService.getTemplateByName('chainable')).toBeDefined();
    });

    it('should handle templates with reset options', () => {
      const templateWithReset = async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
        reset: ['memory', 'context'] as any,
        activeTools: undefined,
      });

      const testService = new TemplateService({ 'resettable': templateWithReset });
      expect(testService.getTemplateByName('resettable')).toBeDefined();
    });

    it('should handle templates with activeTools', () => {
      const templateWithTools = async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
        reset: undefined,
        activeTools: ['tool1', 'tool2', 'tool3'],
      });

      const testService = new TemplateService({ 'tooled': templateWithTools });
      expect(testService.getTemplateByName('tooled')).toBeDefined();
    });
  });

  describe('Error Conditions', () => {
    it('should handle empty templates object', () => {
      const emptyService = new TemplateService({});
      expect(emptyService.listTemplates()).toEqual([]);
      expect(emptyService.getTemplateByName('anything')).toBeUndefined();
    });

    it('should handle templates with missing properties', () => {
      const invalidTemplate = async (input: string) => ({
        inputs: [input],
        // Missing nextTemplate, reset, activeTools
      });

      const testService = new TemplateService({ 'invalid': invalidTemplate });
      expect(testService.getTemplateByName('invalid')).toBeDefined();
    });
  });
});