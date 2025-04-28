#!/usr/bin/env node

import { LocalAgentRPC } from '../LocalAgentRPC';
import { LocalMcpServer } from '../integrations/mcp/LocalMcpServer';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

interface CliOptions {
  port: number;
  configFile?: string;
  useStdio?: boolean;
  useWebSocket?: boolean;
  name?: string;
  version?: string;
}

/**
 * Parse command line arguments
 * @returns The parsed options
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    port: 8080,
    useWebSocket: true,
    useStdio: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' || arg === '-p') {
      const portStr = args[++i];
      const port = parseInt(portStr, 10);

      if (isNaN(port)) {
        console.error(`Invalid port: ${portStr}`);
        process.exit(1);
      }

      options.port = port;
    } else if (arg === '--config' || arg === '-c') {
      options.configFile = args[++i];
    } else if (arg === '--stdio') {
      options.useStdio = true;
    } else if (arg === '--no-websocket') {
      options.useWebSocket = false;
    } else if (arg === '--name') {
      options.name = args[++i];
    } else if (arg === '--version') {
      options.version = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
Local AgentRPC MCP Server

Usage: mcp-server [options]

Options:
  --port, -p <port>      Port to listen on (default: 8080)
  --config, -c <file>    Path to config file
  --stdio                Use stdio transport
  --no-websocket         Disable WebSocket transport
  --name <name>          Server name
  --version <version>    Server version
  --help, -h             Show this help message
`);
}

/**
 * Load tools from a config file
 * @param configFile Path to the config file
 * @param rpc The LocalAgentRPC instance
 */
function loadToolsFromConfig(configFile: string, rpc: LocalAgentRPC) {
  try {
    const configPath = path.resolve(process.cwd(), configFile);
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    if (Array.isArray(config.tools)) {
      for (const tool of config.tools) {
        if (!tool.name || !tool.schema) {
          console.warn(`Skipping invalid tool definition: ${JSON.stringify(tool)}`);
          continue;
        }

        try {
          // Convert JSON schema to Zod schema
          const schema = jsonSchemaToZod(tool.schema);

          // Register the tool
          rpc.register({
            name: tool.name,
            description: tool.description || '',
            schema,
            handler: async (input) => {
              console.log(`Executing tool ${tool.name} with input:`, input);
              // This is a simple implementation that just returns the input
              // In a real implementation, you would call the actual handler
              return input;
            },
          });

          console.log(`Loaded tool: ${tool.name}`);
        } catch (toolError) {
          console.error(`Error registering tool ${tool.name}: ${toolError instanceof Error ? toolError.message : String(toolError)}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error loading config file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Convert a JSON schema to a Zod schema
 * This is a very simplified implementation that only handles basic types
 * In a real implementation, you would use a library like json-schema-to-zod
 */
function jsonSchemaToZod(schema: any): z.ZodType {
  const { z } = require('zod');

  if (schema.type === 'object' && schema.properties) {
    const shape: Record<string, z.ZodType> = {};

    for (const [key, prop] of Object.entries<any>(schema.properties)) {
      let zodType: z.ZodType;

      switch (prop.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'array':
          zodType = z.array(z.any());
          break;
        default:
          zodType = z.any();
      }

      shape[key] = schema.required?.includes(key) ? zodType : zodType.optional();
    }

    return z.object(shape);
  }

  return z.any();
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();

  try {
    // Create the LocalAgentRPC instance
    const rpc = new LocalAgentRPC({
      defaultTimeoutSeconds: 30,
    });

    // Load tools from config file if provided
    if (options.configFile) {
      loadToolsFromConfig(options.configFile, rpc);
    }

    // Create and start the MCP server
    const mcpServer = new LocalMcpServer(rpc, {
      name: options.name,
      version: options.version,
      port: options.port,
      useStdio: options.useStdio,
      useWebSocket: options.useWebSocket,
    });

    // Register some default tools if none were loaded from config
    if (rpc.getAllTools().length === 0) {
      console.log('No tools loaded from config, registering default tools');

      rpc.register({
        name: 'echo',
        description: 'Echo back the input',
        schema: z.object({ message: z.string() }),
        handler: async ({ message }) => {
          return { message };
        },
      });

      rpc.register({
        name: 'getCurrentTime',
        description: 'Get the current time',
        schema: z.object({ timezone: z.string().optional() }),
        handler: async ({ timezone }) => {
          const now = new Date();
          return {
            time: now.toLocaleTimeString('en-US', { timeZone: timezone }),
            date: now.toLocaleDateString('en-US', { timeZone: timezone }),
          };
        },
      });
    }

    // Start the server
    await mcpServer.start();

    const transportInfo = [];
    if (options.useWebSocket) {
      transportInfo.push(`WebSocket on port ${options.port}`);
    }
    if (options.useStdio) {
      transportInfo.push('stdio');
    }

    console.log(`MCP server is running with transports: ${transportInfo.join(', ')}`);
    console.log(`Registered tools: ${rpc.getAllTools().map(t => t.name).join(', ')}`);
    console.log('Press Ctrl+C to stop.');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Received SIGINT. Shutting down...');
      await mcpServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM. Shutting down...');
      await mcpServer.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error starting MCP server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run the main function
main();
