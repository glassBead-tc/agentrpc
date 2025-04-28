// Export main classes
export { LocalAgentRPC, EventType, type EventListener, type LocalAgentRPCOptions } from './LocalAgentRPC';

// Export registry classes
export { LocalToolRegistry, type Tool } from './registry/LocalToolRegistry';

// Export executor classes
export {
  LocalToolExecutor,
  ToolExecutionError,
  type ToolExecutionResult,
  type ExecuteToolOptions
} from './executor/LocalToolExecutor';

// Export OpenAI integration
export { OpenAIIntegration } from './integrations/openai/OpenAIIntegration';
export {
  SchemaConverter,
  type OpenAIFunction,
  type OpenAITool,
  type OpenAIFunctionCall
} from './integrations/openai/SchemaConverter';

// Export MCP integration
export { LocalMcpServer } from './integrations/mcp/LocalMcpServer';

// Re-export zod for convenience
export { z } from 'zod';
