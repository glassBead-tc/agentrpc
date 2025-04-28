import { LocalAgentRPC, z, OpenAIIntegration } from '../src';

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
  name: 'searchProducts',
  description: 'Search for products in the catalog',
  schema: z.object({
    query: z.string(),
    category: z.string().optional(),
    maxResults: z.number().optional(),
  }),
  handler: async ({ query, category, maxResults = 5 }) => {
    console.log(`Searching for ${query} in ${category || 'all categories'}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 700));
    
    return {
      query,
      category: category || 'all',
      results: [
        { id: '1', name: 'Product 1', price: 19.99 },
        { id: '2', name: 'Product 2', price: 29.99 },
        { id: '3', name: 'Product 3', price: 39.99 },
      ].slice(0, maxResults),
    };
  },
});

// Create the OpenAI integration
const openAIIntegration = new OpenAIIntegration(rpc);

// Simulate an OpenAI function call
const simulateOpenAIFunctionCall = async () => {
  // Get the OpenAI tool definitions
  const tools = openAIIntegration.getTools();
  console.log('OpenAI Tool Definitions:');
  console.log(JSON.stringify(tools, null, 2));
  
  // Simulate a function call from OpenAI
  const functionCall = {
    id: 'call_123',
    type: 'function',
    function: {
      name: 'getWeather',
      arguments: JSON.stringify({ location: 'New York' }),
    },
  };
  
  console.log('\nSimulating OpenAI function call:', functionCall);
  
  // Execute the function call
  const result = await openAIIntegration.executeTool(functionCall);
  console.log('\nFunction call result:', result);
  
  // Simulate another function call
  const functionCall2 = {
    id: 'call_456',
    type: 'function',
    function: {
      name: 'searchProducts',
      arguments: JSON.stringify({ query: 'laptop', category: 'electronics', maxResults: 2 }),
    },
  };
  
  console.log('\nSimulating another OpenAI function call:', functionCall2);
  
  // Execute the function call
  const result2 = await openAIIntegration.executeTool(functionCall2);
  console.log('\nFunction call result:', result2);
};

// Run the simulation
simulateOpenAIFunctionCall().catch(console.error);
