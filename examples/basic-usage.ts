import { LocalAgentRPC, z, EventType } from '../src';

// Create a new LocalAgentRPC instance
const rpc = new LocalAgentRPC({
  defaultTimeoutSeconds: 30,
});

// Add an event listener
rpc.addEventListener((eventType, data) => {
  console.log(`Event: ${eventType}`, data);
});

// Register a tool
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

// Register another tool
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

// Execute the tools
async function main() {
  try {
    // Execute the weather tool
    const weatherResult = await rpc.executeTool('getWeather', { location: 'London' });
    console.log('Weather result:', weatherResult);
    
    // Execute the calculator tool
    const sumResult = await rpc.executeTool('calculateSum', { a: 5, b: 7 });
    console.log('Sum result:', sumResult);
    
    // Try to execute a non-existent tool
    try {
      await rpc.executeTool('nonExistentTool', {});
    } catch (error) {
      console.error('Expected error:', error.message);
    }
    
    // Try to execute with invalid input
    try {
      await rpc.executeTool('calculateSum', { a: 'not a number', b: 7 });
    } catch (error) {
      console.error('Expected validation error:', error.message);
    }
    
    // List all tools
    console.log('All tools:', rpc.getAllTools().map(t => t.name));
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

main();
