/**
 * Complete example demonstrating all features of Local AgentRPC
 */

import { LocalAgentRPC, z, EventType, OpenAIIntegration, LocalMcpServer } from '../src';
import { logger, LogLevel } from '../src/utils/logger';
import { performanceMonitor } from '../src/utils/performance';
import { toolCache } from '../src/utils/cache';
import { authService, UserRole } from '../src/security/auth';
import { accessControlService } from '../src/security/access-control';

// Set logger to debug level
logger.setLevel(LogLevel.DEBUG);

// Create a new LocalAgentRPC instance
const rpc = new LocalAgentRPC({
  defaultTimeoutSeconds: 30,
});

// Enable authentication
authService.setEnabled(true);

// Create users
const adminUser = authService.createUser('admin', 'password', UserRole.ADMIN);
const regularUser = authService.createUser('user', 'password', UserRole.USER);
const guestUser = authService.createUser('guest', 'password', UserRole.GUEST);

console.log('Created users:');
console.log(`- Admin: ${adminUser.username} (${adminUser.role})`);
console.log(`- User: ${regularUser.username} (${regularUser.role})`);
console.log(`- Guest: ${guestUser.username} (${guestUser.role})`);

// Set up access control policies
accessControlService.addPolicy({
  toolName: 'getWeather',
  allowedRoles: [UserRole.ADMIN, UserRole.USER, UserRole.GUEST],
});

accessControlService.addPolicy({
  toolName: 'calculateSum',
  allowedRoles: [UserRole.ADMIN, UserRole.USER],
});

accessControlService.addPolicy({
  toolName: 'adminTool',
  allowedRoles: [UserRole.ADMIN],
});

// Add an event listener
rpc.addEventListener((eventType, data) => {
  switch (eventType) {
    case EventType.TOOL_REGISTERED:
      console.log(`Event: Tool registered: ${data.toolName}`);
      break;
    case EventType.TOOL_EXECUTION_STARTED:
      console.log(`Event: Tool execution started: ${data.toolName}`);
      break;
    case EventType.TOOL_EXECUTION_COMPLETED:
      console.log(`Event: Tool execution completed: ${data.toolName} in ${data.executionTimeMs}ms`);
      break;
    case EventType.TOOL_EXECUTION_FAILED:
      console.error(`Event: Tool execution failed: ${data.toolName}`, data.error);
      break;
  }
});

// Register tools
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
  config: {
    enableCache: true,
    cacheTimeSeconds: 300, // 5 minutes
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

rpc.register({
  name: 'adminTool',
  description: 'A tool only accessible to admins',
  schema: z.object({
    data: z.string(),
  }),
  handler: ({ data }) => {
    return { processed: data, adminOnly: true };
  },
});

// Create the OpenAI integration
const openAIIntegration = new OpenAIIntegration(rpc);

// Create the MCP server
const mcpServer = new LocalMcpServer(rpc, {
  name: 'ExampleServer',
  version: '1.0.0',
  port: 8080,
  useStdio: false,
  useWebSocket: true,
});

// Main function to demonstrate all features
async function main() {
  try {
    // Start the MCP server
    await mcpServer.start();
    console.log('MCP server started on port 8080');
    
    // Get OpenAI tool definitions
    const tools = openAIIntegration.getTools();
    console.log('\nOpenAI Tool Definitions:');
    console.log(JSON.stringify(tools, null, 2));
    
    // Execute tools with different users
    console.log('\n--- Executing tools as different users ---');
    
    // Execute as admin
    console.log('\nExecuting as admin:');
    await executeToolsAsUser(UserRole.ADMIN);
    
    // Execute as regular user
    console.log('\nExecuting as regular user:');
    await executeToolsAsUser(UserRole.USER);
    
    // Execute as guest
    console.log('\nExecuting as guest:');
    await executeToolsAsUser(UserRole.GUEST);
    
    // Demonstrate caching
    console.log('\n--- Demonstrating caching ---');
    console.log('\nFirst call (cache miss):');
    const start1 = Date.now();
    await rpc.executeTool('getWeather', { location: 'London' }, { userRole: UserRole.USER });
    console.log(`Execution time: ${Date.now() - start1}ms`);
    
    console.log('\nSecond call (cache hit):');
    const start2 = Date.now();
    await rpc.executeTool('getWeather', { location: 'London' }, { userRole: UserRole.USER });
    console.log(`Execution time: ${Date.now() - start2}ms`);
    
    // Show performance metrics
    console.log('\n--- Performance Metrics ---');
    const metrics = performanceMonitor.getToolMetricsForTool('getWeather');
    console.log('Weather tool metrics:', metrics);
    
    const avgTime = performanceMonitor.getAverageExecutionTime('getWeather');
    console.log(`Average execution time for weather tool: ${avgTime}ms`);
    
    // Simulate OpenAI function call
    console.log('\n--- Simulating OpenAI function call ---');
    const functionCall = {
      id: 'call_123',
      type: 'function',
      function: {
        name: 'getWeather',
        arguments: JSON.stringify({ location: 'New York' }),
      },
    };
    
    console.log('Function call:', functionCall);
    const result = await openAIIntegration.executeTool(functionCall);
    console.log('Result:', result);
    
    // Keep the server running for a while
    console.log('\nServer is running. Press Ctrl+C to stop.');
    
    // Wait for user input to stop
    process.stdin.resume();
    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    await cleanup();
    process.exit(1);
  }
}

// Execute all tools as a specific user
async function executeToolsAsUser(role: UserRole) {
  try {
    // Get weather
    console.log('Executing getWeather:');
    const weatherResult = await rpc.executeTool('getWeather', { location: 'London' }, { userRole: role });
    console.log('Result:', weatherResult.result);
    
    // Calculate sum
    console.log('\nExecuting calculateSum:');
    try {
      const sumResult = await rpc.executeTool('calculateSum', { a: 5, b: 7 }, { userRole: role });
      console.log('Result:', sumResult.result);
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    // Admin tool
    console.log('\nExecuting adminTool:');
    try {
      const adminResult = await rpc.executeTool('adminTool', { data: 'test' }, { userRole: role });
      console.log('Result:', adminResult.result);
    } catch (error) {
      console.error('Error:', error.message);
    }
  } catch (error) {
    console.error('Error executing tools:', error);
  }
}

// Cleanup function
async function cleanup() {
  console.log('\nCleaning up...');
  
  // Stop the MCP server
  await mcpServer.stop();
  console.log('MCP server stopped');
  
  // Clear the cache
  toolCache.clear();
  console.log('Cache cleared');
}

// Run the main function
main();
