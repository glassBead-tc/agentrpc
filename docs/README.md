# Local AgentRPC Documentation

This documentation provides a comprehensive guide to using the Local AgentRPC implementation.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Tool Registration](#tool-registration)
- [Tool Execution](#tool-execution)
- [OpenAI Integration](#openai-integration)
- [MCP Server](#mcp-server)
- [Security](#security)
- [Performance Optimization](#performance-optimization)
- [Logging](#logging)
- [Event System](#event-system)
- [API Reference](#api-reference)

## Introduction

Local AgentRPC is a local implementation of the AgentRPC platform that eliminates dependencies on the AgentRPC platform while maintaining compatibility with MCP and OpenAI integrations. It provides a way to register and execute tools locally, with support for validation, caching, security, and performance monitoring.

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

## Tool Registration

Tools are registered with a name, description, schema, and handler function. The schema is defined using Zod, which provides runtime type checking and validation.

```typescript
rpc.register({
  name: 'calculateSum',
  description: 'Calculate the sum of two numbers',
  schema: z.object({
    a: z.number(),
    b: z.number(),
  }),
  handler: ({ a, b }) => {
    return { sum: a + b };
  },
  config: {
    timeoutSeconds: 30,
    enableCache: true,
    cacheTimeSeconds: 300,
    allowedRoles: ['admin', 'user'],
  },
});
```

### Tool Configuration Options

- `timeoutSeconds`: Maximum time in seconds for the tool to execute
- `retryCountOnStall`: Number of times to retry if the tool stalls
- `enableCache`: Whether to cache the results of the tool
- `cacheTimeSeconds`: How long to cache results in seconds
- `allowedRoles`: Array of roles allowed to access the tool

## Tool Execution

Tools are executed by name with input parameters. The input is validated against the schema before execution.

```typescript
const result = await rpc.executeTool('calculateSum', { a: 5, b: 7 });
console.log(result.result); // { sum: 12 }
```

### Execution Options

```typescript
const result = await rpc.executeTool('calculateSum', { a: 5, b: 7 }, {
  timeoutMs: 5000,
  useCache: true,
  cacheTtlMs: 300000,
  userRole: 'admin',
  collectMetrics: true,
});
```

## OpenAI Integration

Local AgentRPC provides integration with OpenAI-compatible APIs, allowing you to use your tools with OpenAI models.

```typescript
import { LocalAgentRPC, OpenAIIntegration } from 'local-agentrpc';
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

## MCP Server

Local AgentRPC provides an MCP server implementation that allows you to expose your tools to MCP clients like Claude Desktop.

```typescript
import { LocalAgentRPC, LocalMcpServer } from 'local-agentrpc';

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

// Create and start the MCP server
const mcpServer = new LocalMcpServer(rpc, {
  name: 'MyServer',
  version: '1.0.0',
  port: 8080,
  useStdio: true,
  useWebSocket: true,
});

await mcpServer.start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await mcpServer.stop();
  process.exit(0);
});
```

### MCP Server CLI

Local AgentRPC provides a CLI command for starting the MCP server:

```bash
npx local-mcp-server --port 8080 --stdio --config tools.json
```

## Security

Local AgentRPC provides authentication and access control for tools.

### Authentication

```typescript
import { LocalAgentRPC, authService, UserRole } from 'local-agentrpc';

// Enable authentication
authService.setEnabled(true);

// Create users
const adminUser = authService.createUser('admin', 'password', UserRole.ADMIN);
const regularUser = authService.createUser('user', 'password', UserRole.USER);

// Authenticate a user
const user = authService.authenticate('admin', 'password');
if (user) {
  console.log(`Authenticated as ${user.username} with role ${user.role}`);
}

// Generate a token
const token = authService.generateToken(user);

// Verify a token
const verifiedUser = authService.verifyToken(token);
```

### Access Control

```typescript
import { LocalAgentRPC, accessControlService, UserRole } from 'local-agentrpc';

// Add access control policies
accessControlService.addPolicy({
  toolName: 'getWeather',
  allowedRoles: [UserRole.ADMIN, UserRole.USER],
});

accessControlService.addPolicy({
  toolName: 'adminTool',
  allowedRoles: [UserRole.ADMIN],
});

// Check if a role is allowed to access a tool
const isAllowed = accessControlService.isAllowed('getWeather', UserRole.USER);
console.log(isAllowed); // true

// Execute a tool with access control
const result = await rpc.executeTool('getWeather', { location: 'London' }, {
  userRole: UserRole.USER,
});
```

## Performance Optimization

Local AgentRPC provides performance monitoring and caching for tools.

### Performance Monitoring

```typescript
import { LocalAgentRPC, performanceMonitor } from 'local-agentrpc';

// Get performance metrics for a tool
const metrics = performanceMonitor.getToolMetricsForTool('getWeather');
console.log(metrics);

// Get average execution time
const avgTime = performanceMonitor.getAverageExecutionTime('getWeather');
console.log(`Average execution time: ${avgTime}ms`);

// Get system metrics
const systemMetrics = performanceMonitor.getSystemMetrics();
console.log(systemMetrics);
```

### Caching

```typescript
import { LocalAgentRPC, toolCache } from 'local-agentrpc';

// Configure caching for a tool
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

// Clear the cache
toolCache.clear();
```

## Logging

Local AgentRPC provides a logging system for debugging and monitoring.

```typescript
import { LocalAgentRPC, logger, LogLevel } from 'local-agentrpc';

// Set the log level
logger.setLevel(LogLevel.DEBUG);

// Log messages
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// Create a custom logger
const customLogger = new Logger({
  level: LogLevel.INFO,
  timestamps: true,
  logHandler: (level, message, ...args) => {
    // Custom log handling
    console.log(`[CUSTOM] ${message}`, ...args);
  },
});
```

## Event System

Local AgentRPC provides an event system for monitoring tool registration and execution.

```typescript
import { LocalAgentRPC, EventType } from 'local-agentrpc';

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

// Remove an event listener
rpc.removeEventListener(listener);
```

## API Reference

### LocalAgentRPC

- `constructor(options?: LocalAgentRPCOptions)`: Create a new LocalAgentRPC instance
- `register(tool: Tool)`: Register a tool
- `executeTool(toolName: string, input: any, options?: ExecuteToolOptions)`: Execute a tool
- `getTool(name: string)`: Get a tool by name
- `getAllTools()`: Get all registered tools
- `addEventListener(listener: EventListener)`: Add an event listener
- `removeEventListener(listener: EventListener)`: Remove an event listener

### LocalToolRegistry

- `register(tool: Tool)`: Register a tool
- `getTool(name: string)`: Get a tool by name
- `getAllTools()`: Get all registered tools
- `hasTool(name: string)`: Check if a tool exists
- `removeTool(name: string)`: Remove a tool

### LocalToolExecutor

- `executeTool(toolName: string, input: any, options?: ExecuteToolOptions)`: Execute a tool

### OpenAIIntegration

- `getTools()`: Get all tools in OpenAI format
- `executeTool(functionCall: OpenAIFunctionCall)`: Execute a tool from an OpenAI function call

### LocalMcpServer

- `constructor(agentRPC: LocalAgentRPC, options?: LocalMcpServerOptions)`: Create a new MCP server
- `start(port?: number)`: Start the MCP server
- `stop()`: Stop the MCP server

### AuthService

- `setEnabled(enabled: boolean)`: Enable or disable authentication
- `isEnabled()`: Check if authentication is enabled
- `createUser(username: string, password: string, role?: UserRole)`: Create a new user
- `getUser(id: string)`: Get a user by ID
- `getUserByUsername(username: string)`: Get a user by username
- `getUserByApiKey(apiKey: string)`: Get a user by API key
- `authenticate(username: string, password: string)`: Authenticate a user
- `authenticateWithApiKey(apiKey: string)`: Authenticate a user with an API key
- `generateToken(user: User)`: Generate a token for a user
- `verifyToken(token: string)`: Verify a token

### AccessControlService

- `addPolicy(policy: AccessControlPolicy)`: Add a policy for a tool
- `removePolicy(toolName: string)`: Remove a policy for a tool
- `getPolicy(toolName: string)`: Get the policy for a tool
- `isAllowed(toolName: string, role: UserRole)`: Check if a role is allowed to access a tool
- `setDefaultPolicy(policy: AccessControlPolicy)`: Set the default policy
- `getDefaultPolicy()`: Get the default policy
- `getAllPolicies()`: Get all policies
- `clearPolicies()`: Clear all policies

### PerformanceMonitor

- `recordToolMetrics(metrics: ToolPerformanceMetrics)`: Record metrics for a tool execution
- `getToolMetrics()`: Get all tool metrics
- `getToolMetricsForTool(toolName: string)`: Get tool metrics for a specific tool
- `getAverageExecutionTime(toolName: string)`: Get the average execution time for a tool
- `getSystemMetrics()`: Get all system metrics
- `startCollectingSystemMetrics(intervalMs?: number)`: Start collecting system metrics
- `stopCollectingSystemMetrics()`: Stop collecting system metrics
- `clearMetrics()`: Clear all metrics

### ToolCache

- `set(key: string, value: any, ttlMs?: number)`: Set a value in the cache
- `get(key: string)`: Get a value from the cache
- `has(key: string)`: Check if a key exists in the cache
- `delete(key: string)`: Delete a key from the cache
- `clear()`: Clear the cache
- `size()`: Get the number of entries in the cache
- `startCleanup(intervalMs?: number)`: Start the cleanup interval
- `stopCleanup()`: Stop the cleanup interval
- `cleanup()`: Clean up expired entries

### Logger

- `setLevel(level: LogLevel)`: Set the log level
- `debug(message: string, ...args: any[])`: Log a debug message
- `info(message: string, ...args: any[])`: Log an info message
- `warn(message: string, ...args: any[])`: Log a warning message
- `error(message: string, ...args: any[])`: Log an error message
