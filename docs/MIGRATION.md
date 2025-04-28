# Migration Guide from AgentRPC to Local AgentRPC

This guide will help you migrate your application from the original AgentRPC platform to the Local AgentRPC implementation.

## Table of Contents

- [Overview](#overview)
- [Key Differences](#key-differences)
- [Basic Migration Steps](#basic-migration-steps)
- [Tool Registration](#tool-registration)
- [Tool Execution](#tool-execution)
- [OpenAI Integration](#openai-integration)
- [MCP Server](#mcp-server)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Overview

Local AgentRPC is designed to be a drop-in replacement for the original AgentRPC platform, with the key difference being that it runs entirely locally without requiring an external service. This means you can use it in environments where you don't have internet access or where you need to keep your tools and data private.

## Key Differences

- **No API Secret Required**: Local AgentRPC doesn't require an API secret since it doesn't connect to an external service.
- **Local Execution**: All tools are executed locally, which means you have full control over the execution environment.
- **Additional Features**: Local AgentRPC includes additional features like caching, performance monitoring, and access control that aren't available in the original AgentRPC.
- **MCP Server**: The MCP server is built-in and doesn't require a separate service.

## Basic Migration Steps

1. Install Local AgentRPC:

```bash
npm uninstall agentrpc
npm install local-agentrpc
```

2. Update your imports:

```typescript
// Before
import { AgentRPC } from 'agentrpc';

// After
import { LocalAgentRPC } from 'local-agentrpc';
```

3. Update your initialization code:

```typescript
// Before
const rpc = new AgentRPC({
  apiSecret: process.env.AGENTRPC_API_SECRET,
});

// After
const rpc = new LocalAgentRPC({
  defaultTimeoutSeconds: 30, // Optional
});
```

4. Update your tool registration and execution code as needed (see below).

## Tool Registration

The tool registration API is mostly compatible between AgentRPC and Local AgentRPC:

```typescript
// Before
rpc.register({
  name: 'getWeather',
  description: 'Return weather information at a given location',
  schema: z.object({ location: z.string() }),
  handler: async ({ location }) => {
    return {
      location,
      temperature: '22°C',
      conditions: 'Partly cloudy',
    };
  },
});

// After - same code works!
rpc.register({
  name: 'getWeather',
  description: 'Return weather information at a given location',
  schema: z.object({ location: z.string() }),
  handler: async ({ location }) => {
    return {
      location,
      temperature: '22°C',
      conditions: 'Partly cloudy',
    };
  },
});
```

Local AgentRPC supports additional configuration options:

```typescript
rpc.register({
  name: 'getWeather',
  description: 'Return weather information at a given location',
  schema: z.object({ location: z.string() }),
  handler: async ({ location }) => {
    return {
      location,
      temperature: '22°C',
      conditions: 'Partly cloudy',
    };
  },
  config: {
    timeoutSeconds: 30,
    enableCache: true,
    cacheTimeSeconds: 300,
    allowedRoles: ['admin', 'user'],
  },
});
```

## Tool Execution

The tool execution API is also mostly compatible:

```typescript
// Before
const result = await rpc.executeTool('getWeather', { location: 'London' });

// After - same code works!
const result = await rpc.executeTool('getWeather', { location: 'London' });
```

Local AgentRPC supports additional execution options:

```typescript
const result = await rpc.executeTool('getWeather', { location: 'London' }, {
  timeoutMs: 5000,
  useCache: true,
  cacheTtlMs: 300000,
  userRole: 'admin',
  collectMetrics: true,
});
```

## OpenAI Integration

The OpenAI integration API is compatible:

```typescript
// Before
const tools = await rpc.OpenAI.getTools();
const result = await rpc.OpenAI.executeTool(toolCall);

// After
const openAIIntegration = new OpenAIIntegration(rpc);
const tools = openAIIntegration.getTools();
const result = await openAIIntegration.executeTool(toolCall);
```

## MCP Server

The MCP server is built-in to Local AgentRPC and doesn't require a separate service:

```typescript
// Before
// Used the 'agentrpc mcp' command or API

// After
import { LocalMcpServer } from 'local-agentrpc';

const mcpServer = new LocalMcpServer(rpc, {
  name: 'MyServer',
  version: '1.0.0',
  port: 8080,
  useStdio: true,
  useWebSocket: true,
});

await mcpServer.start();
```

Or use the CLI command:

```bash
npx local-mcp-server --port 8080 --stdio --config tools.json
```

## Advanced Features

Local AgentRPC includes several advanced features that aren't available in the original AgentRPC:

### Authentication and Access Control

```typescript
import { authService, accessControlService, UserRole } from 'local-agentrpc';

// Enable authentication
authService.setEnabled(true);

// Create users
const adminUser = authService.createUser('admin', 'password', UserRole.ADMIN);

// Add access control policies
accessControlService.addPolicy({
  toolName: 'getWeather',
  allowedRoles: [UserRole.ADMIN, UserRole.USER],
});

// Execute with access control
const result = await rpc.executeTool('getWeather', { location: 'London' }, {
  userRole: UserRole.ADMIN,
});
```

### Caching

```typescript
import { toolCache } from 'local-agentrpc';

// Configure caching for a tool
rpc.register({
  name: 'getWeather',
  description: 'Return weather information at a given location',
  schema: z.object({ location: z.string() }),
  handler: async ({ location }) => {
    return {
      location,
      temperature: '22°C',
      conditions: 'Partly cloudy',
    };
  },
  config: {
    enableCache: true,
    cacheTimeSeconds: 300, // 5 minutes
  },
});

// Execute with caching
const result = await rpc.executeTool('getWeather', { location: 'London' }, {
  useCache: true,
  cacheTtlMs: 300000, // 5 minutes
});
```

### Performance Monitoring

```typescript
import { performanceMonitor } from 'local-agentrpc';

// Get performance metrics for a tool
const metrics = performanceMonitor.getToolMetricsForTool('getWeather');
console.log(metrics);

// Get average execution time
const avgTime = performanceMonitor.getAverageExecutionTime('getWeather');
console.log(`Average execution time: ${avgTime}ms`);
```

### Logging

```typescript
import { logger, LogLevel } from 'local-agentrpc';

// Set the log level
logger.setLevel(LogLevel.DEBUG);

// Log messages
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

### Event System

```typescript
import { EventType } from 'local-agentrpc';

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

## Troubleshooting

### Common Issues

#### "Tool not found" error

Make sure you've registered the tool with the correct name and that the tool is registered before you try to execute it.

#### Validation errors

Check that the input you're providing matches the schema you've defined for the tool.

#### Timeout errors

If you're getting timeout errors, you may need to increase the timeout for the tool:

```typescript
rpc.register({
  name: 'slowOperation',
  description: 'A slow operation',
  schema: z.object({ /* ... */ }),
  handler: async (input) => {
    // ...
  },
  config: {
    timeoutSeconds: 60, // Increase timeout to 60 seconds
  },
});
```

Or when executing:

```typescript
const result = await rpc.executeTool('slowOperation', input, {
  timeoutMs: 60000, // 60 seconds
});
```

#### Access denied errors

If you're using access control and getting access denied errors, check that the user has the correct role and that the role is allowed to access the tool:

```typescript
accessControlService.addPolicy({
  toolName: 'secureOperation',
  allowedRoles: [UserRole.ADMIN, UserRole.USER],
});
```

### Getting Help

If you're having issues with Local AgentRPC, check the [GitHub repository](https://github.com/yourusername/local-agentrpc) for issues and discussions, or open a new issue if you can't find a solution.
