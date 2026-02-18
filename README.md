# @tokenring-ai/template

The Template package provides a powerful registry system for running reusable AI-powered prompt templates by name. It enables users to accelerate repetitive tasks such as translation, content generation, summarization, and complex multi-step workflows through template chaining.

## Features

- **Template Registry**: Manage named template functions with centralized registration
- **Template Chaining**: Support for running multiple templates in sequence via `nextTemplate`
- **Context Management**: Ability to reset context and manage tool states during template execution
- **Multiple Inputs**: Handle arrays of inputs within a single template execution
- **Tool Integration**: Automatic tool and command registration with TokenRing applications
- **Error Handling**: Comprehensive error handling with circular reference detection
- **State Persistence**: Template execution preserves and restores agent tool states
- **Command System**: Interactive chat commands (`/template`) for template management

## Installation

This package is automatically included when using TokenRing applications. To configure custom templates:

```typescript
// In your app configuration
export default {
  templates: {
    myTemplate: myTemplateFunction,
    anotherTemplate: anotherTemplateFunction,
  }
}
```

## Core Components

### TemplateService

The central service that manages template registration and execution:

```typescript
import { TemplateService } from "@tokenring-ai/template";

// Access via agent
const templateService = agent.requireServiceByType(TemplateService);

// List available templates
const templates = templateService.listTemplates();

// Get a specific template
const template = templateService.getTemplateByName("myTemplate");

// Run a template
const result = await templateService.runTemplate(
  { templateName: "myTemplate", input: "Hello world" },
  agent
);
```

### Template Function Structure

Templates are async functions that accept an input string and return a `TemplateChatRequest`:

```typescript
import { TemplateChatRequest } from "@tokenring-ai/template";

export async function myTemplate(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
    // Optional parameters
    nextTemplate: "followUpTemplate", // Chain to another template
    reset: ["chat", "memory"], // Reset context types
    activeTools: ["websearch", "wikipedia"], // Enable specific tools
  };
}
```

### TemplateChatRequest Schema

```typescript
interface TemplateChatRequest {
  inputs: string[];                    // Array of inputs to process
  nextTemplate?: string;               // Next template to run
  reset?: ResetWhat[];                 // Context types to reset
  activeTools?: string[];              // Tools to enable during execution
}
```

### TemplateResult Schema

```typescript
interface TemplateResult {
  ok: boolean;
  output?: string;
  response?: any;
  error?: string;
  nextTemplateResult?: TemplateResult; // For chained templates
}
```

## Usage Examples

### Basic Template Execution

```typescript
// Run a template
const result = await templateService.runTemplate(
  { templateName: "summarize", input: "Long article text..." },
  agent
);

console.log(result.output); // AI response
```

### Template Chaining

```typescript
// First template generates content
export async function generateDraft(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
    nextTemplate: "improveDraft", // Chain to improvement template
  };
}

// Second template improves the draft
export async function improveDraft(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
    // No nextTemplate, so this ends the chain
  };
}
```

### Context Reset and Tool Management

```typescript
export async function newTaskTemplate(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
    reset: ["chat", "memory", "events"], // Clear previous context
    activeTools: ["websearch", "wikipedia"], // Enable only these tools
  };
}
```

### Multiple Inputs

```typescript
export async function multiStepAnalysis(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [
      "Analyze this data for trends",
      "Identify key insights",
      "Generate recommendations"
    ],
  };
}
```

## API Reference

### TemplateService Methods

#### `listTemplates(): string[]`

Returns an array of all registered template names.

#### `getTemplateByName(name: string): TemplateFunction | undefined`

Retrieves a template function by name.

#### `runTemplate({ templateName, input, visitedTemplates? }, agent): Promise<TemplateResult>`

Executes a template with the given input.

**Parameters:**
- `templateName`: Name of the template to run
- `input`: Input text for the template
- `visitedTemplates`: Array to track template chain (internal use)

**Returns:**
```typescript
interface TemplateResult {
  ok: boolean;
  output?: string;
  response?: any;
  error?: string;
  nextTemplateResult?: TemplateResult; // For chained templates
}
```

## Tools

The package provides two main tools:

### `template_list`

Lists all available templates.

**Parameters:** None  
**Returns:** `{ templates: string[] }`

**Tool Definition:**
```typescript
{
  name: "template_list",
  displayName: "Template/listTemplates",
  description: "Lists all available templates. Returns an array of template names that can be used with the runTemplate tool.",
  inputSchema: z.object({}),
  execute: (input, agent) => Promise<{ type: "json", data: { templates: string[] } }>
}
```

### `template_run`

Runs a template with the given input.

**Parameters:**
- `templateName`: Name of the template to run
- `input`: Input text for the template

**Returns:** `{ output?: string, response?: any }`

**Tool Definition:**
```typescript
{
  name: "template_run",
  displayName: "Template/runTemplate",
  description: "Run a template with the given input. Templates are predefined prompt patterns that generate AI requests.",
  inputSchema: z.object({
    templateName: z.string().describe("The name of the template to run."),
    input: z.string().describe("The input to pass to the template."),
  }),
  execute: ({templateName, input}, agent) => Promise<{ type: "json", data: { output?: string, response?: any } }>
}
```

## Chat Commands

The package provides the `/template` command with the following subcommands:

### `/template list`

List all available templates.

**Example:**
```
/template list
```

### `/template run <templateName> [input]`

Run a template with optional input.

**Arguments:**
- `templateName`: Name of the template to run
- `input`: Optional input text for the template

**Example:**
```
/template run summarize This is the text to summarize
```

### `/template info <templateName>`

Show information about a specific template.

**Arguments:**
- `templateName`: Name of the template to get info about

**Example:**
```
/template info summarize
```

## Configuration

Templates are configured via the TokenRing configuration system. The configuration schema is defined as `TemplateConfigSchema` and is automatically validated:

```typescript
import { TemplateConfigSchema } from "@tokenring-ai/template";

const config = {
  templates: TemplateConfigSchema.parse({
    summarize: async (input: string) => ({
      inputs: [input],
    }),
    translateToFrench: async (input: string) => ({
      inputs: [input],
    }),
    research: async (input: string) => ({
      inputs: [input],
      activeTools: ["websearch", "wikipedia"],
      nextTemplate: "summarizeFindings",
    }),
  })
};
```

**Configuration Schema:**
```typescript
z.record(
  z.string(),
  z.custom<(input: string) => Promise<TemplateChatRequest>>()
).optional()
```

## Integration with TokenRing Ecosystem

### Plugin Architecture

The package automatically integrates with TokenRing applications via the plugin system. The plugin registers:

- **ChatTools**: `template_list` and `template_run` tools
- **AgentCommands**: `/template` command with subcommands (`list`, `info`, `run`)
- **TemplateService**: Manages template registry and execution

### Service Dependencies

- **ChatService**: For chat execution and tool management
- **Agent**: For template execution context

### State Management

- **Tool State**: Automatically preserved and restored during template execution
- **Context**: Supports selective context reset via `reset` parameter
- **Chain Tracking**: Prevents circular references in template chains

## Error Handling

The package includes comprehensive error handling:

- **Missing Templates**: Clear error when template not found
- **Circular References**: Detection and prevention of template chain loops
- **Invalid Inputs**: Validation of required parameters
- **Tool State**: Proper restoration of tool states even on errors

### Error Examples

```typescript
// Missing template
try {
  await templateService.runTemplate({ templateName: "nonexistent", input: "test" }, agent);
} catch (error) {
  console.log(error.message); // "Template not found: nonexistent"
}

// Circular reference
const templateWithCircularRef = async (input: string) => ({
  inputs: [input],
  nextTemplate: "anotherTemplate", // This could create a circular reference
});
```

## Development

### Creating Templates

1. Define your template function:

```typescript
import { TemplateChatRequest } from "@tokenring-ai/template";

export async function myCustomTemplate(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
    // Add your template logic here
  };
}
```

2. Register it in your configuration:

```typescript
export default {
  templates: {
    myCustomTemplate: myCustomTemplate,
  }
}
```

3. Use it via the TemplateService:

```typescript
const result = await templateService.runTemplate(
  { templateName: "myCustomTemplate", input: "Your input here" },
  agent
);
```

### Testing Templates

```typescript
// Test your template function directly
const chatRequest = await myCustomTemplate("test input");
console.log(chatRequest.inputs); // ["test input"]
console.log(chatRequest.nextTemplate); // undefined if no chaining
```

### Run Tests

```bash
bun run test
```

## Package Structure

```
pkg/template/
├── index.ts                    # Package exports (TemplateConfigSchema, TemplateService)
├── package.json                # Package metadata and dependencies
├── plugin.ts                   # TokenRing plugin implementation
├── TemplateService.ts          # Core template management service
├── tools.ts                    # Tool exports (template_list, template_run)
├── tools/
│   ├── listTemplates.ts        # List templates tool implementation
│   └── runTemplate.ts          # Run template tool implementation
├── chatCommands.ts             # Chat command exports (/template)
├── commands/
│   └── template/
│       ├── template.ts         # Main template command router
│       ├── info.ts             # /template info subcommand
│       ├── list.ts             # /template list subcommand
│       └── run.ts              # /template run subcommand
├── tests/
│   ├── TemplateService.test.ts
│   ├── commands.test.ts
│   ├── integration.test.ts
│   └── tools.test.ts
└── docs/
    └── design.md               # Design documentation
```

## Dependencies

### Production Dependencies
- `@tokenring-ai/ai-client`: Multi-provider AI integration
- `@tokenring-ai/app`: Base application framework
- `@tokenring-ai/agent`: Central orchestration system
- `@tokenring-ai/chat`: Chat service and integration
- `@tokenring-ai/utility`: Shared utilities and helpers
- `zod`: Schema validation

### Development Dependencies
- `vitest`: Testing framework
- `typescript`: TypeScript compiler

## License

MIT License - see [LICENSE](./LICENSE) file for details.
