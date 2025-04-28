import { LocalAgentRPC } from '../../LocalAgentRPC';
import { SchemaConverter, OpenAITool, OpenAIFunctionCall } from './SchemaConverter';

/**
 * Integration with OpenAI for tool definitions and execution
 */
export class OpenAIIntegration {
  constructor(private agentRPC: LocalAgentRPC) {}

  /**
   * Get all tools in OpenAI format
   * @returns An array of OpenAI tool definitions
   */
  getTools(): OpenAITool[] {
    const tools = this.agentRPC.getAllTools();
    return tools.map(tool => SchemaConverter.convertToolToOpenAITool(tool));
  }

  /**
   * Execute a tool from an OpenAI function call
   * @param functionCall The OpenAI function call
   * @returns The result of the tool execution
   */
  async executeTool(functionCall: OpenAIFunctionCall): Promise<any> {
    const toolName = functionCall.function.name;
    const args = SchemaConverter.parseFunctionCallArguments(functionCall);
    
    const result = await this.agentRPC.executeTool(toolName, args);
    return result.result;
  }
}
