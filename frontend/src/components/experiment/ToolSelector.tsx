import React from 'react';
import { Box, Typography } from '@mui/material';
import { toolConfigs } from '@/data/toolConfigs';
import ToolCard from './ToolCard';

interface ToolSelectorProps {
  selectedToolId: string | null;
  onSelectTool: (toolId: string) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({ selectedToolId, onSelectTool }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Select Analysis Tool
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Choose a spatial domain segmentation algorithm for your analysis
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {toolConfigs.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            selected={selectedToolId === tool.id}
            onSelect={() => onSelectTool(tool.id)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ToolSelector;
