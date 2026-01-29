import React, { useState } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Button, Chip, Checkbox, FormControlLabel } from '@mui/material';
import { GridView, CenterFocusWeak, Download } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import SpatialPlot from './SpatialPlot';

const ComparisonView: React.FC = () => {
  const { experiments, setWorkspaceMode, comparisonExperimentIds, toggleComparisonExperiment, setActiveExperiment } =
    useApp();

  const completedExperiments = experiments.filter((e) => e.status === 'completed');
  const selectedExperiments = completedExperiments.filter((e) => comparisonExperimentIds.includes(e.id));

  // If no experiments selected, auto-select first ones
  const displayExperiments =
    selectedExperiments.length > 0
      ? selectedExperiments
      : completedExperiments.slice(0, Math.min(4, completedExperiments.length));

  const gridCols = displayExperiments.length <= 2 ? displayExperiments.length : 2;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight={600}>
            Compare Experiments
          </Typography>
          <Chip
            label={`${displayExperiments.length} experiments`}
            size="small"
            sx={{ bgcolor: 'primary.light', color: 'white' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup size="small" value="comparison" exclusive>
            <ToggleButton
              value="focus"
              onClick={() => {
                if (completedExperiments.length > 0) {
                  setActiveExperiment(completedExperiments[0].id);
                }
              }}
            >
              <CenterFocusWeak sx={{ mr: 0.5, fontSize: 18 }} />
              Focus
            </ToggleButton>
            <ToggleButton value="comparison">
              <GridView sx={{ mr: 0.5, fontSize: 18 }} />
              Compare
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Experiment Selector */}
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#FAFAFA' }}>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
          Select experiments to compare (max 4):
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {completedExperiments.map((exp) => (
            <FormControlLabel
              key={exp.id}
              control={
                <Checkbox
                  checked={comparisonExperimentIds.includes(exp.id) || (selectedExperiments.length === 0 && displayExperiments.includes(exp))}
                  onChange={() => toggleComparisonExperiment(exp.id)}
                  disabled={comparisonExperimentIds.length >= 4 && !comparisonExperimentIds.includes(exp.id)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {exp.toolName} ({exp.parameters.n_clusters} clusters)
                </Typography>
              }
            />
          ))}
        </Box>
      </Box>

      {/* Grid Layout */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }} className="workspace-scroll">
        {displayExperiments.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
              No Completed Experiments
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              Complete at least two experiments to compare results
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: 3,
            }}
          >
            {displayExperiments.map((exp) => (
              <Box key={exp.id}>
                <SpatialPlot
                  result={exp.result}
                  metrics={exp.metrics}
                  title={`${exp.toolName} (${exp.parameters.n_clusters} domains)`}
                  height={350}
                  showLegend={false}
                  compact
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ComparisonView;
