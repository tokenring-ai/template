AI Template Package integration design

- The package will be in pkg/template
- A Template registry should be created in pkg/template/TemplateRegistry.js
- The chat command exposed to the user will be called /template, and should be placed in
  pkg/template/chatCommands/template.js

Basic functionality and workflow

- This package will provide users the ability to run a prompt template using the /template command.
- A prompt template is a JavaScript file that accepts an input string, and returns a chat request to make, that can be
  dispatched to the ai-client.

---

## User Stories

### User Story 1: Running a Prompt Template

**As a user**, I want to run reusable AI-powered prompt templates by name so that I can accelerate repetitive tasks (
e.g., translation, drafting, summarization).

- **Acceptance Criteria:**
 - User enters: `/template run <templateName> <input>`
 - Command validates input and template name.
 - AI responds according to the template's prompt logic.

### User Story 2: Listing Available Templates

**As a user**, I want to list all available prompt templates so I know what tools are at my disposal.

- **Acceptance Criteria:**
 - User enters: `/template list`
 - The system returns a list of template names.

### User Story 3: Retrieving Template Information

**As a user**, I want to view details about a specific prompt template so I understand what input it expects and how it
will behave.

- **Acceptance Criteria:**
 - User enters: `/template info <templateName>`
 - System displays template description, example usage, and input hints.

### User Story 4: Error Handling for Template Execution

**As a user**, I want to receive clear errors when I enter an invalid template name or provide incorrect parameters.

- **Acceptance Criteria:**
 - Invalid template returns an error: "Template not found."
 - Missing input returns usage help or error.

---

## Example Templates

```javascript
export async function translateToFrench(prompt) {
 return {
  system: "You are a French translator. Translate the following text to French.",
  user: prompt
 };
}

export async function createCompanyHistoryArticle(prompt) {
 return {
  system: "You are an expert business writer. Write a detailed company history article for the company named in the input.",
  user: prompt,
  temperature: 0.3
 };
}

export async function translateThenSummarize(prompt) {
 return {
  system: "You are a French translator. Translate the following text to French.",
  user: prompt,
  nextTemplate: "summarize" // This will run the "summarize" template after translation
 };
}

export async function summarize(prompt) {
 return {
  system: "You are a summarization expert. Create a concise summary of the following text.",
  user: prompt
 };
}
```

---

## Template Chaining Feature

Templates can specify another template to run after they complete by including a `nextTemplate` property in their return
object. This enables creating template chains for multi-step processing.

### How Template Chaining Works

1. A template includes a `nextTemplate` property in its return object, specifying the name of the next template to run.
2. After the first template completes, the system automatically runs the specified next template.
3. The output of the first template is passed as input to the next template.
4. Results from all templates in the chain are combined in the final response.

### Example Use Cases

- Translation followed by summarization
- Data extraction followed by formatting
- Content generation followed by review/editing
- Multi-step analysis workflows

### Implementation Details

- Circular references are detected and prevented
- Each template in the chain receives the output of the previous template as its input
- The final result includes the outputs from all templates in the chain

---

## Template Run Command Implementation Details

1. When user executes `/template run <templateName> <input>`, the following occurs:
 - Command validates that templateName exists in registry.
 - Input string is extracted from remaining command text.
 - Template function is retrieved from registry using templateName.
 - Template function is executed with provided input.
 - If the template specifies a `nextTemplate`, that template is run next with the output of the first template.
 - Resulting ChatRequest is dispatched to ai-client.
 - Response from AI is displayed in chat.

2. Error handling:
 - Invalid template name returns error message.
 - Missing input parameters shows usage help.
 - Template execution errors are caught and displayed.
 - AI client errors are properly propagated.

3. Example template execution flow:
    ```javascript
    // User input: /template run translateToFrench "Hello world"
    const template = templateRegistry.get("translateToFrench");
    const chatRequest = await template("Hello world");
    // chatRequest: {
    //   system: "You are a French translator. Translate the following text to French.",
    //   user: "Hello world"
    // }
    const response = await aiClient.streamChat(chatRequest);
    ```

---

## Technical details

- The TemplateRegistry will store currently available templates using:
 - `templates`: Map<string, TemplateFunction>
 - TemplateFunction: `(input: string) => Promise<ChatRequest>`
- CRUD operations:
 - `register(name: string, template: TemplateFunction)`
 - `unregister(name: string)`
 - `get(name: string): TemplateFunction`
 - `list(): string[]` - Returns names of all registered templates

---

## Example Chat Commands

- `/template list`  
  *Lists all available templates.*
- `/template run <templateName> <input>`  
  *Runs the specified template with given input.*
- `/template info <templateName>`  
  *Shows details about a specific template.*

**Examples:**

```
text
/template run createCompanyHistoryArticle "Microsoft (MSFT)"
/template run translateToFrench "Hello world"
/template info createCompanyHistoryArticle
```

