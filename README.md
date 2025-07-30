# Template Package

The Template package provides functionality for running reusable AI-powered prompt templates by name. This allows users to accelerate repetitive tasks such as translation, drafting, and summarization.

## Features

- Run prompt templates with custom input
- List available templates
- View template information
- Error handling for template execution

## Usage

### Chat Commands

The package provides the following chat commands:

- `/template list` - Lists all available templates
- `/template run <templateName> <input>` - Runs the specified template with the given input
- `/template info <templateName>` - Shows information about a specific template

### Examples

```
/template run translateToFrench "Hello world"
/template run createCompanyHistoryArticle "Microsoft (MSFT)"
/template info createCompanyHistoryArticle
```

## Creating Templates

Templates are JavaScript functions that accept an input string and return a chat request object. The chat request object should include at least a `system` prompt and a `user` message.

### Template Structure

```javascript
export async function myTemplate(prompt) {
  return {
    system: "System prompt for the AI",
    user: prompt,
    // Optional parameters
    temperature: 0.7,
    model: "specific-model-name"
  };
}
```

### Example Templates

Two example templates are provided:

1. `translateToFrench` - Translates text to French
2. `createCompanyHistoryArticle` - Creates a detailed company history article

## Configuration

To use templates in your application, add them to your configuration file:

```javascript
// writer-config.js
export default {
  // ... other configuration
  templates: {
    translateToFrench: (await import("../../templates/translateToFrench.js")).translateToFrench,
    createCompanyHistoryArticle: (await import("../../templates/createCompanyHistoryArticle.js")).createCompanyHistoryArticle,
    // Add your custom templates here
  }
};
```

## Technical Details

The Template package consists of:

- `TemplateRegistry` - Manages and provides access to templates
- `/template` chat command - Interface for users to interact with templates
- Example templates - Ready-to-use template functions

The `TemplateRegistry` stores templates using a Map and provides CRUD operations:
- `register(name, template)` - Registers a template function
- `unregister(name)` - Unregisters a template
- `get(name)` - Gets a template function by name
- `list()` - Lists all registered templates
- `loadTemplates(templates)` - Loads templates from a configuration object