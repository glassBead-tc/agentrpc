import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '../../registry/LocalToolRegistry';

/**
 * OpenAI function definition
 */
export interface OpenAIFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

/**
 * OpenAI tool definition
 */
export interface OpenAITool {
  type: 'function';
  function: OpenAIFunction;
}

/**
 * OpenAI function call
 */
export interface OpenAIFunctionCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
  type: 'function';
}

/**
 * Converter for Zod schemas to OpenAI function definitions
 */
export class SchemaConverter {
  /**
   * Convert a tool to an OpenAI tool definition
   * @param tool The tool to convert
   * @returns The OpenAI tool definition
   */
  static convertToolToOpenAITool(tool: Tool): OpenAITool {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.convertZodSchemaToOpenAIParameters(tool.schema),
      },
    };
  }

  /**
   * Convert a Zod schema to OpenAI parameters
   * @param schema The Zod schema to convert
   * @returns The OpenAI parameters
   */
  static convertZodSchemaToOpenAIParameters(schema: z.ZodType): Record<string, any> {
    return zodToJsonSchema(schema, { target: 'openApi3' });
  }

  /**
   * Parse arguments from an OpenAI function call
   * @param functionCall The OpenAI function call
   * @returns The parsed arguments
   */
  static parseFunctionCallArguments(functionCall: OpenAIFunctionCall): any {
    try {
      return JSON.parse(functionCall.function.arguments);
    } catch (error) {
      throw new Error(`Failed to parse function call arguments: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
