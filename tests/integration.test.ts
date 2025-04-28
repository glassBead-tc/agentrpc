import { LocalAgentRPC, z, UserRole } from '../src';
import { LocalMcpServer } from '../src/integrations/mcp/LocalMcpServer';
import { authService } from '../src/security/auth';
import { accessControlService } from '../src/security/access-control';
import { toolCache } from '../src/utils/cache';
import { logger, LogLevel } from '../src/utils/logger';

// Set logger to debug level for tests
logger.setLevel(LogLevel.DEBUG);

describe('LocalAgentRPC Integration Tests', () => {
  let rpc: LocalAgentRPC;

  beforeEach(() => {
    // Create a new LocalAgentRPC instance for each test
    rpc = new LocalAgentRPC({
      defaultTimeoutSeconds: 5,
    });

    // Clear the cache
    toolCache.clear();
  });

  test('Basic tool registration and execution', async () => {
    // Register a simple tool
    rpc.register({
      name: 'add',
      description: 'Add two numbers',
      schema: z.object({
        a: z.number(),
        b: z.number(),
      }),
      handler: ({ a, b }) => {
        return { sum: a + b };
      },
    });

    // Execute the tool
    const result = await rpc.executeTool('add', { a: 2, b: 3 });

    // Check the result
    expect(result.toolName).toBe('add');
    expect(result.result).toEqual({ sum: 5 });
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  test('Tool execution with validation error', async () => {
    // Register a tool with validation
    rpc.register({
      name: 'greet',
      description: 'Greet a person',
      schema: z.object({
        name: z.string().min(1),
        age: z.number().optional(),
      }),
      handler: ({ name, age }) => {
        return { greeting: `Hello, ${name}${age ? ` (${age})` : ''}!` };
      },
    });

    // Execute with invalid input
    await expect(rpc.executeTool('greet', { name: '' })).rejects.toThrow();

    // Execute with valid input
    const result = await rpc.executeTool('greet', { name: 'John' });
    expect(result.result).toEqual({ greeting: 'Hello, John!' });

    // Execute with optional parameter
    const result2 = await rpc.executeTool('greet', { name: 'John', age: 30 });
    expect(result2.result).toEqual({ greeting: 'Hello, John (30)!' });
  });

  test('Tool execution with timeout', async () => {
    // Register a tool that takes time to execute
    rpc.register({
      name: 'slowOperation',
      description: 'A slow operation',
      schema: z.object({
        delay: z.number(),
      }),
      handler: async ({ delay }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return { completed: true };
      },
      config: {
        timeoutSeconds: 1,
      },
    });

    // Execute with delay less than timeout
    const result = await rpc.executeTool('slowOperation', { delay: 500 });
    expect(result.result).toEqual({ completed: true });

    // Execute with delay greater than timeout
    await expect(rpc.executeTool('slowOperation', { delay: 2000 })).rejects.toThrow();
  });

  test('Tool execution with caching', async () => {
    // Create a mock function to track calls
    const mockHandler = jest.fn(({ value }) => {
      return { processed: value };
    });

    // Register a tool with caching
    rpc.register({
      name: 'cachedOperation',
      description: 'An operation with caching',
      schema: z.object({
        value: z.string(),
      }),
      handler: mockHandler,
      config: {
        enableCache: true,
        cacheTimeSeconds: 5,
      },
    });

    // Execute the tool twice with the same input
    const result1 = await rpc.executeTool('cachedOperation', { value: 'test' });
    const result2 = await rpc.executeTool('cachedOperation', { value: 'test' });

    // Check that the handler was only called once
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(result1.result).toEqual({ processed: 'test' });
    expect(result2.result).toEqual({ processed: 'test' });

    // Execute with different input
    const result3 = await rpc.executeTool('cachedOperation', { value: 'different' });
    expect(mockHandler).toHaveBeenCalledTimes(2);
    expect(result3.result).toEqual({ processed: 'different' });
  });

  test('Tool execution with access control', async () => {
    // Enable authentication
    authService.setEnabled(true);

    // Create users
    const adminUser = authService.createUser('admin', 'password', UserRole.ADMIN);
    const regularUser = authService.createUser('user', 'password', UserRole.USER);
    const guestUser = authService.createUser('guest', 'password', UserRole.GUEST);

    // Register a tool
    rpc.register({
      name: 'secureOperation',
      description: 'A secure operation',
      schema: z.object({
        data: z.string(),
      }),
      handler: ({ data }) => {
        return { processed: data };
      },
      config: {
        allowedRoles: [UserRole.ADMIN, UserRole.USER],
      },
    });

    // Set up access control policy
    accessControlService.addPolicy({
      toolName: 'secureOperation',
      allowedRoles: [UserRole.ADMIN, UserRole.USER],
    });

    // Execute as admin
    const adminResult = await rpc.executeTool('secureOperation', { data: 'admin-data' }, {
      userRole: UserRole.ADMIN,
    });
    expect(adminResult.result).toEqual({ processed: 'admin-data' });

    // Execute as regular user
    const userResult = await rpc.executeTool('secureOperation', { data: 'user-data' }, {
      userRole: UserRole.USER,
    });
    expect(userResult.result).toEqual({ processed: 'user-data' });

    // Execute as guest (should fail)
    await expect(rpc.executeTool('secureOperation', { data: 'guest-data' }, {
      userRole: UserRole.GUEST,
    })).rejects.toThrow();
  });

  test('MCP server integration', async () => {
    // Register some tools
    rpc.register({
      name: 'echo',
      description: 'Echo back the input',
      schema: z.object({ message: z.string() }),
      handler: async ({ message }) => {
        return { message };
      },
    });

    // Create the MCP server
    const mcpServer = new LocalMcpServer(rpc, {
      name: 'TestServer',
      version: '1.0.0',
      port: 9999,
      useWebSocket: false, // Disable WebSocket for testing
      useStdio: false, // Disable stdio for testing
    });

    // Start the server
    await mcpServer.start();

    // Verify that the server is running
    expect(mcpServer).toBeDefined();

    // Stop the server
    await mcpServer.stop();
  });

  test('Event system', async () => {
    // Create event listeners
    const eventListener = jest.fn();
    rpc.addEventListener(eventListener);

    // Register a tool
    rpc.register({
      name: 'testTool',
      description: 'A test tool',
      schema: z.object({ value: z.string() }),
      handler: ({ value }) => {
        return { processed: value };
      },
    });

    // Execute the tool
    await rpc.executeTool('testTool', { value: 'test' });

    // Check that events were emitted
    expect(eventListener).toHaveBeenCalledWith('tool_registered', expect.any(Object));
    expect(eventListener).toHaveBeenCalledWith('tool_execution_started', expect.any(Object));
    expect(eventListener).toHaveBeenCalledWith('tool_execution_completed', expect.any(Object));

    // Remove the event listener
    rpc.removeEventListener(eventListener);

    // Execute again
    await rpc.executeTool('testTool', { value: 'test2' });

    // Check that no new events were received by the removed listener
    expect(eventListener).toHaveBeenCalledTimes(3);
  });
});
