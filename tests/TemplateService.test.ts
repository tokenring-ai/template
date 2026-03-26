import {beforeEach, describe, expect, it} from 'vitest';
import TemplateService from '../TemplateService.ts';

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    // Mock template functions
    const mockTemplates = {
      'test-template': async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
        activeTools: undefined,
      }),
      'chained-template': async (input: string) => ({
        inputs: [input],
        nextTemplate: 'final-template',
        activeTools: undefined,
      }),
      'final-template': async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
        activeTools: undefined,
      }),
      'tools-template': async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
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
        activeTools: undefined,
      });

      const testService = new TemplateService({ 'valid': validTemplate });
      expect(testService.getTemplateByName('valid')).toBeDefined();
    });

    it('should handle templates with nextTemplate', () => {
      const templateWithChaining = async (input: string) => ({
        inputs: [input],
        nextTemplate: 'test-template',
        activeTools: undefined,
      });

      const testService = new TemplateService({ 'chainable': templateWithChaining });
      expect(testService.getTemplateByName('chainable')).toBeDefined();
    });

    it('should handle templates with activeTools', () => {
      const templateWithTools = async (input: string) => ({
        inputs: [input],
        nextTemplate: undefined,
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
        // Missing nextTemplate, activeTools
      });

      const testService = new TemplateService({ 'invalid': invalidTemplate });
      expect(testService.getTemplateByName('invalid')).toBeDefined();
    });
  });
});
