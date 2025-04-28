# Local AgentRPC

A local implementation of AgentRPC that eliminates dependencies on the AgentRPC platform while maintaining compatibility with MCP and OpenAI integrations.

## Features

- Local tool registry for registering and managing tools
- Tool execution engine with validation, timeouts, and error handling
- OpenAI integration for using tools with OpenAI-compatible APIs
- Event system for monitoring tool registration and execution
- Zero external dependencies beyond the core libraries

## Installation

```bash
npm install local-agentrpc
```

## Basic Usage

```typescript
import { LocalAgentRPC, z } from 'local-agentrpc';

// Create a new LocalAgentRPC instance
const rpc = new LocalAgentRPC();

// Register a tool
rpc.register({
  name: 'getWeather',
  description: 'Return weather information at a given location',
  schema: z.object({ location: z.string() }),
  handler: async ({ location }) => {
    // Implement your weather logic here
    return {
      location,
      temperature: '22°C',
      conditions: 'Partly cloudy',
    };
  },
});

// Execute the tool
const result = await rpc.executeTool('getWeather', { location: 'London' });
console.log(result);
```

## OpenAI Integration

```typescript
import { LocalAgentRPC, z, OpenAIIntegration } from 'local-agentrpc';
import { OpenAI } from 'openai';

// Create a new LocalAgentRPC instance
const rpc = new LocalAgentRPC();

// Register your tools
rpc.register({
  name: 'getWeather',
  description: 'Return weather information at a given location',
  schema: z.object({ location: z.string() }),
  handler: async ({ location }) => {
    // Implement your weather logic here
    return {
      location,
      temperature: '22°C',
      conditions: 'Partly cloudy',
    };
  },
});

// Create the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create the OpenAI integration
const openAIIntegration = new OpenAIIntegration(rpc);

// Get the OpenAI tool definitions
const tools = openAIIntegration.getTools();

// Use the tools with OpenAI
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    {
      role: 'user',
      content: 'What is the weather in London?',
    },
  ],
  tools,
});

// Handle tool calls
const message = completion.choices[0]?.message;
if (message?.tool_calls) {
  for (const toolCall of message.tool_calls) {
    const result = await openAIIntegration.executeTool(toolCall);
    console.log(result);
  }
}
```

## Event System

```typescript
import { LocalAgentRPC, EventType } from 'local-agentrpc';

const rpc = new LocalAgentRPC();

// Add an event listener
rpc.addEventListener((eventType, data) => {
  switch (eventType) {
    case EventType.TOOL_REGISTERED:
      console.log(`Tool registered: ${data.toolName}`);
      break;
    case EventType.TOOL_EXECUTION_STARTED:
      console.log(`Tool execution started: ${data.toolName}`);
      break;
    case EventType.TOOL_EXECUTION_COMPLETED:
      console.log(`Tool execution completed: ${data.toolName} in ${data.executionTimeMs}ms`);
      break;
    case EventType.TOOL_EXECUTION_FAILED:
      console.error(`Tool execution failed: ${data.toolName}`, data.error);
      break;
  }
});
```

## License

MIT
