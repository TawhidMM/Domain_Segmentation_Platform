import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ToolSchema } from '@/types';
import { toolService } from '@/services/toolService';
import ToolCard from './ToolCard';

interface ToolSelectorProps {
  selectedToolId: string | null;
  onSelectTool: (schema: ToolSchema) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({ selectedToolId, onSelectTool }) => {
  const [tools, setTools] = useState<ToolSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTools = async () => {
      try {
        setLoading(true);
        const schemas = await toolService.fetchToolSchemas();
        setTools(schemas);
        setError(null);
      } catch (err) {
        console.error('Failed to load tool schemas:', err);
        setError('Failed to load analysis tools. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadTools();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Select Analysis Tool
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Choose a spatial domain segmentation algorithm for your analysis
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tools.map((tool) => (
          <ToolCard
            key={tool.tool_id}
            tool={tool}
            selected={selectedToolId === tool.tool_id}
            onSelect={() => onSelectTool(tool)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ToolSelector;
