import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/websocket.js';
import { z } from 'zod';
import { LocalAgentRPC } from '../../LocalAgentRPC';
import { Tool } from '../../registry/LocalToolRegistry';
import { ToolExecutionError } from '../../executor/LocalToolExecutor';

/**
 * Options for the MCP server
 */
export interface LocalMcpServerOptions {
  /** The name of the server */
  name?: string;
  /** The version of the server */
  version?: string;
  /** The port to listen on for WebSocket connections */
  port?: number;
  /** Whether to use stdio for transport */
  useStdio?: boolean;
  /** Whether to use WebSocket for transport */
  useWebSocket?: boolean;
}

/**
 * MCP server implementation for LocalAgentRPC
 */
export class LocalMcpServer {
  private mcpServer: McpServer;
  private webSocketTransport?: WebSocketServerTransport;
  private stdioTransport?: StdioServerTransport;
  private options: LocalMcpServerOptions;
  private isRunning: boolean = false;

  /**
   * Create a new LocalMcpServer
   * @param agentRPC The LocalAgentRPC instance to use
   * @param options Options for the server
   */
  constructor(private agentRPC: LocalAgentRPC, options: LocalMcpServerOptions = {}) {
    this.options = {
      name: options.name || 'LocalAgentRPC',
      version: options.version || '0.1.0',
      port: options.port || 8080,
      useStdio: options.useStdio !== undefined ? options.useStdio : false,
      useWebSocket: options.useWebSocket !== undefined ? options.useWebSocket : true,
    };

    // Create the MCP server
    this.mcpServer = new McpServer({
      name: this.options.name,
      version: this.options.version,
    });

    // Register all tools from the LocalAgentRPC instance
    this.registerTools();

    // Listen for tool registration events
    this.agentRPC.addEventListener((eventType, data) => {
      if (eventType === 'tool_registered') {
        this.registerTool(this.agentRPC.getTool(data.toolName)!);
      }
    });
  }

  /**
   * Register all tools from the LocalAgentRPC instance with the MCP server
   */
  private registerTools(): void {
    const tools = this.agentRPC.getAllTools();
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Register a single tool with the MCP server
   * @param tool The tool to register
   */
  private registerTool(tool: Tool): void {
    this.mcpServer.tool(
      tool.name,
      tool.description,
      tool.schema,
      async (input) => {
        try {
          const result = await this.agentRPC.executeTool(tool.name, input);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.result),
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof ToolExecutionError
            ? `Error executing tool '${tool.name}': ${error.message}`
            : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;

          return {
            content: [
              {
                type: 'text',
                text: errorMessage,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Start the MCP server
   * @param port Optional port to override the default
   */
  async start(port?: number): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Override port if provided
    if (port !== undefined) {
      this.options.port = port;
    }

    try {
      // Start WebSocket transport if enabled
      if (this.options.useWebSocket) {
        this.webSocketTransport = new WebSocketServerTransport({
          port: this.options.port,
        });

        console.log(`Starting MCP WebSocket server on port ${this.options.port}`);
        await this.webSocketTransport.listen(this.mcpServer);
      }

      // Start stdio transport if enabled
      if (this.options.useStdio) {
        this.stdioTransport = new StdioServerTransport();

        console.log('Starting MCP stdio server');
        await this.stdioTransport.listen(this.mcpServer);
      }

      this.isRunning = true;
      console.log('MCP server started successfully');
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Stop WebSocket transport if it was started
      if (this.webSocketTransport) {
        await this.webSocketTransport.close();
        this.webSocketTransport = undefined;
      }

      // Stop stdio transport if it was started
      if (this.stdioTransport) {
        await this.stdioTransport.close();
        this.stdioTransport = undefined;
      }

      // Close the MCP server
      await this.mcpServer.close();

      this.isRunning = false;
      console.log('MCP server stopped successfully');
    } catch (error) {
      console.error('Failed to stop MCP server:', error);
      throw error;
    }
  }
}
