import { LocalAgentRPC, z, LocalMcpServer } from '../src';

// Create a new LocalAgentRPC instance
const rpc = new LocalAgentRPC();

// Register some tools
rpc.register({
  name: 'getWeather',
  description: 'Return weather information at a given location',
  schema: z.object({ location: z.string() }),
  handler: async ({ location }) => {
    console.log(`Getting weather for ${location}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      location,
      temperature: '22°C',
      conditions: 'Partly cloudy',
      humidity: '65%',
    };
  },
});

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
});

// Create and start the MCP server
async function main() {
  try {
    // Create the MCP server
    const mcpServer = new LocalMcpServer(rpc);
    
    // Start the server
    await mcpServer.start(8080);
    
    console.log('MCP server is running. Press Ctrl+C to stop.');
    
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
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

main();
