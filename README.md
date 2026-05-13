# @tokenring-ai/template

The Template package provides a powerful registry system for running reusable AI-powered prompt templates by name. It
enables users to accelerate repetitive tasks such as translation, content generation, summarization, and complex
multi-step workflows through template chaining.

## Overview

The `@tokenring-ai/template` package provides a comprehensive system for managing and executing reusable AI prompt
templates. It enables users to accelerate repetitive tasks through template chaining, tool management, and seamless
integration with the TokenRing ecosystem via plugin architecture, chat commands, and tools.

## Key Features

- **Template Registry**: Manage named template functions with centralized registration using `KeyedRegistry`
- **Template Chaining**: Support for running multiple templates in sequence via `nextTemplate`
- **Tool Management**: Automatic tool state preservation and restoration during template execution
- **Multiple Inputs**: Handle arrays of inputs within a single template execution
- **Tool Integration**: Automatic tool and command registration with TokenRing applications
- **Error Handling**: Comprehensive error handling with circular reference detection
- **Command System**: Interactive chat commands (`/template list`, `/template run`, `/template info`) for template
  management
- **Circular Reference Detection**: Prevents infinite template loops
- **Tool State Restoration**: Automatically restores original tool states after template execution

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

The central service that manages template registration and execution. Implements the `TokenRingService` interface.

```typescript
import {TemplateService} from "@tokenring-ai/template";

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

**Properties:**

- `name: string` - Service name ("TemplateService")
- `description: string` - Service description ("Provides a registry of prompt templates")
- `templates: KeyedRegistry<TemplateFunction>` - Registry of template functions

**Methods:**

- `listTemplates(): string[]` - Returns an array of all registered template names
- `getTemplateByName(name: string): TemplateFunction | undefined` - Retrieves a template function by name
- `runTemplate({ templateName, input, visitedTemplates? }, agent): Promise<TemplateResult>` - Executes a template with
  the given input

### Template Function Structure

Templates are async functions that accept an input string and return a `TemplateChatRequest`:

```typescript
import { TemplateChatRequest } from "@tokenring-ai/template";

export async function myTemplate(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
    // Optional: Chain to another template
    nextTemplate: "followUpTemplate",
    // Optional: Enable specific tools during execution
    activeTools: ["websearch", "wikipedia"],
  };
}
```

### TemplateChatRequest Schema

```typescript
interface TemplateChatRequest {
  inputs: string[];           // Array of inputs to process
  nextTemplate?: string;      // Next template to run (for chaining)
  activeTools?: string[];     // Tools to enable during execution
}
```

### TemplateResult Schema

```typescript
interface TemplateResult {
  ok: boolean;                // Whether execution was successful
  output?: string;            // Final AI output text
  response?: any;             // Full AI response object
  error?: string;             // Error message if ok is false
  nextTemplateResult?: TemplateResult; // Result from chained template
}
```

### TemplateFunction Type

```typescript
type TemplateFunction = (input: string) => Promise<TemplateChatRequest>;
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

### Tool Management

```typescript
export async function researchTemplate(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
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

### Complex Workflow with Chaining

```typescript
export async function complexWorkflow(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
    activeTools: ["websearch"], // Enable only web search
    nextTemplate: "summarizeFindings" // Chain to summarization
  };
}

export async function summarizeFindings(input: string): Promise<TemplateChatRequest> {
  return {
    inputs: [input],
    // No tools needed for summarization
  };
}
```

## API Reference

### TemplateService Methods

#### `listTemplates(): string[]`

Returns an array of all registered template names.

**Returns:** `string[]` - Array of template names

#### `getTemplateByName(name: string): TemplateFunction | undefined`

Retrieves a template function by name.

**Parameters:**

- `name`: Name of the template to retrieve

**Returns:** `TemplateFunction | undefined` - The template function or undefined if not found

#### `runTemplate({ templateName, input, visitedTemplates? }, agent): Promise<TemplateResult>`

Executes a template with the given input.

**Parameters:**

- `templateName`: Name of the template to run
- `input`: Input text for the template
- `visitedTemplates`: Array to track template chain (internal use, optional)
- `agent`: Agent instance for execution context

**Returns:** `Promise<TemplateResult>` - Execution result

**Throws:**

- `Error` if template not found
- `Error` if circular reference detected
- `Error` if AI response does not complete successfully

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

**Usage Example:**

```typescript
import { Agent } from "@tokenring-ai/agent";

const result = await agent.callTool("template_list", {});
console.log(result.data.templates); // ["summarize", "translateToFrench", ...]
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
    displayName
:
  "Template/runTemplate",
    description
:
  "Run a template with the given input. Templates are predefined prompt patterns that generate AI requests.",
    inputSchema
:
  z.object({
    templateName: z.string().describe("The name of the template to run."),
    input: z.string().describe("The input to pass to the template."),
  }),
    execute
:
  ({ templateName, input }, agent) => Promise<{ type: "json", data: { output?: string, response?: any } }>
}
```

**Usage Example:**

```typescript
import { Agent } from "@tokenring-ai/agent";

const result = await agent.callTool("template_run", {
  templateName: "summarize",
  input: "Content to summarize..."
});
console.log(result.data.output);
```

## Chat Commands

The package provides three chat commands for template management:

### `/template list`

List all available templates.

**Example:**

```
/template list
```

**Output:**

```
Available templates:
- summarize
- translateToFrench
- research
```

### `/template run <templateName> [input]`

Run a template with optional input text.

**Arguments:**

- `templateName`: Name of the template to run
- `input`: Optional input text for the template

**Example:**

```
/template run summarize This is the text to summarize
```

**Output:**

```
Template executed
```

### `/template info <templateName>`

Show information about a specific template.

**Arguments:**

- `templateName`: Name of the template to get info about

**Example:**

```
/template info summarize
```

**Output:**

```
Template: summarize
Usage:
  /template run summarize <input>
```

## Configuration

Templates are configured via the TokenRing configuration system. The configuration schema is defined as
`TemplateConfigSchema` and is automatically validated.

### Configuration Schema

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

**Schema Definition:**

```typescript
z.record(
  z.string(),
  z.custom<(input: string) => Promise<TemplateChatRequest>>()
).optional()
```

### Plugin Configuration

```typescript
// In your app configuration
export default {
  templates: {
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
  }
}
```

**Note:** The plugin only registers services and tools when `config.templates` is provided. If no templates are
configured, the plugin will not add any services or commands.

## Integration with TokenRing Ecosystem

### Plugin Architecture

The package automatically integrates with TokenRing applications via the plugin system. The plugin registers:

- **ChatTools**: `template_list` and `template_run` tools
- **AgentCommands**: `/template list`, `/template run`, and `/template info` commands
- **TemplateService**: Manages template registry and execution

**Plugin Registration:**

```typescript
import { TokenRingAppConfig } from "@tokenring-ai/app";
import templatePlugin from "@tokenring-ai/template";

export default {
  plugins: {
    template: {
      templates: {
        summarize: async (input: string) => ({
          inputs: [input],
        }),
        translateToFrench: async (input: string) => ({
          inputs: [input],
        }),
      }
    }
  }
} satisfies TokenRingAppConfig;
```

### Service Dependencies

- **ChatService**: For chat execution and tool management
- **Agent**: For template execution context

### State Management

- **Tool State**: Automatically preserved and restored during template execution
- **Chain Tracking**: Prevents circular references in template chains via `visitedTemplates` parameter

## Error Handling

The package includes comprehensive error handling:

- **Missing Templates**: Clear error when template not found
- **Circular References**: Detection and prevention of template chain loops
- **Invalid Inputs**: Validation of required parameters
- **Tool State**: Proper restoration of tool states even on errors
- **AI Response Validation**: Ensures AI responses complete with "stop" finish reason

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

// The package will detect and prevent circular references:
// Error: "Circular template reference detected: templateName has already been run in this chain."
```

### AI Response Validation

The package validates that AI responses complete successfully:

```typescript
// If the AI does not stop as expected:
// Error: "AI Chat did not stop as expected, Reason: <finishReason>"
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

1. Register it in your configuration:

```typescript
export default {
  templates: {
    myCustomTemplate: myCustomTemplate,
  }
}
```

1. Use it via the TemplateService:

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

### Running Tests

```bash
bun run test
```

### Test Files

The package includes comprehensive test coverage:

- `tests/TemplateService.test.ts` - Unit tests for TemplateService
- `tests/commands.test.ts` - Tests for chat commands
- `tests/integration.test.ts` - Integration tests
- `tests/tools.test.ts` - Tests for tool implementations

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
├── commands.ts                 # Chat command exports (/template list, /template run, /template info)
├── commands/
│   └── template/
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

- `@tokenring-ai/ai-client`: Multi-provider AI integration (0.2.0)
- `@tokenring-ai/app`: Base application framework (0.2.0)
- `@tokenring-ai/agent`: Central orchestration system (0.2.0)
- `@tokenring-ai/chat`: Chat service and integration (0.2.0)
- `@tokenring-ai/utility`: Shared utilities and helpers (0.2.0)
- `zod`: Schema validation (^4.3.6)

### Development Dependencies

- `vitest`: Testing framework (^4.1.0)
- `typescript`: TypeScript compiler (^5.9.3)

## Related Components

- [`@tokenring-ai/chat`](../chat/README.md): Chat service for template execution
- [`@tokenring-ai/agent`](../agent/README.md): Agent system for template context
- [`@tokenring-ai/ai-client`](../ai-client/README.md): AI client for template generation
- [`@tokenring-ai/utility`](../utility/README.md): Utility functions including KeyedRegistry

## Best Practices

1. **Template Naming**: Use clear, descriptive names that indicate the template's purpose
2. **Chaining**: Keep template chains short and well-documented to avoid confusion
3. **Tool Selection**: Enable only necessary tools for each template to optimize performance
4. **Error Handling**: Always handle potential errors when running templates
5. **Circular References**: Use the `visitedTemplates` tracking mechanism to prevent infinite loops
6. **Tool State Restoration**: Be aware that the package automatically restores tool states after template execution

## License

MIT License - see [LICENSE](./LICENSE) file for details.
