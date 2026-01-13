import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import createSubcommandRouter from "@tokenring-ai/agent/util/subcommandRouter";
import list from "./template/list.js";
import info from "./template/info.js";
import run from "./template/run.js";

const description = "/template - Run prompt templates";

const execute = createSubcommandRouter({
  list,
  info,
  run
});

const help: string = `# Template Command

Run and manage prompt templates.

## Usage

\`/template [subcommand] [options]\`

## Subcommands

### \`list\`
List all available templates.

**Example:**
\`\`\`
/template list
\`\`\`

### \`run <templateName> [input]\`
Run a template with optional input.

**Arguments:**
- \`templateName\` - Name of the template to run
- \`input\` - Optional input text for the template

**Example:**
\`\`\`
/template run summarize This is the text to summarize
\`\`\`

### \`info <templateName>\`
Show information about a specific template.

**Arguments:**
- \`templateName\` - Name of the template to get info about

**Example:**
\`\`\`
/template info summarize
\`\`\`

## Description

The template command allows you to work with reusable prompt templates. Templates can be used to standardize common AI interactions and workflows.
`;

export default {
  description,
  execute,
  help,
} satisfies TokenRingAgentCommand