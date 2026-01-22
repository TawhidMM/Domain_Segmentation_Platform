import axiosInstance from '@/lib/axios';
import { ToolSchema } from '@/types';

export const toolService = {
  /**
   * Fetch all available tool schemas from the API
   */
  async fetchToolSchemas(): Promise<ToolSchema[]> {
    const response = await axiosInstance.get<ToolSchema[]>('/tools/schemas');
    return response.data;
  },

  /**
   * Fetch schema for a specific tool
   */
  async fetchToolSchema(toolId: string): Promise<ToolSchema> {
    const response = await axiosInstance.get<ToolSchema>(`/tools/schemas/${toolId}`);
    return response.data;
  },
};
