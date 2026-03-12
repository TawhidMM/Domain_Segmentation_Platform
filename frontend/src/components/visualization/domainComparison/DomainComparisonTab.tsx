import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import {
  CompareToolSelection,
  DomainComparisonRequestItem,
  DomainComparisonResponse,
} from './types';
import DomainComparisonPlot from './DomainComparisonPlot';
import DomainMetricsTable from './DomainMetricsTable';
import { fetchDomainComparisonData } from '@/services/experimentService';
import { useComparisonDataset } from '@/context/ComparisonDatasetContext';

interface DomainComparisonTabProps {
  tools: CompareToolSelection[];
}

const DomainComparisonTab: React.FC<DomainComparisonTabProps> = ({ tools }) => {
  const { selectedDataset } = useComparisonDataset();
  const [selectedToolA, setSelectedToolA] = useState<CompareToolSelection | null>(null);
  const [selectedToolB, setSelectedToolB] = useState<CompareToolSelection | null>(null);
  const [comparisonData, setComparisonData] = useState<DomainComparisonResponse | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tools.length < 2) {
      setSelectedToolA(null);
      setSelectedToolB(null);
      return;
    }

    setSelectedToolA((prev) => prev ?? tools[0]);
    setSelectedToolB((prev) => prev ?? tools[1]);
  }, [tools]);

  const selectedToolAId = selectedToolA?.experiment_id ?? '';
  const selectedToolBId = selectedToolB?.experiment_id ?? '';

  const handleToolAChange = (event: SelectChangeEvent<string>) => {
    const tool = tools.find((item) => item.experiment_id === event.target.value) ?? null;
    setSelectedToolA(tool);
  };

  const handleToolBChange = (event: SelectChangeEvent<string>) => {
    const tool = tools.find((item) => item.experiment_id === event.target.value) ?? null;
    setSelectedToolB(tool);
  };

  useEffect(() => {
    if (!selectedToolA || !selectedToolB) {
      setComparisonData(null);
      setSelectedDomain(null);
      return;
    }

    if (selectedToolA.experiment_id === selectedToolB.experiment_id) {
      setComparisonData(null);
      setSelectedDomain(null);
      setError('Tool A and Tool B must be different experiments.');
      return;
    }

    if (!selectedDataset) {
      setComparisonData(null);
      setSelectedDomain(null);
      setError('No dataset selected.');
      return;
    }

    let isActive = true;

    const loadDomainComparison = async () => {
      setLoading(true);
      setError(null);

      try {
        const requestBody: DomainComparisonRequestItem[] = [
          {
            experiment_id: selectedToolA.experiment_id,
            token: selectedToolA.token,
          },
          {
            experiment_id: selectedToolB.experiment_id,
            token: selectedToolB.token,
          },
        ];

        const data = await fetchDomainComparisonData(requestBody, selectedDataset);

        if (!isActive) {
          return;
        }

        setComparisonData(data);

        const minDomain = data.spots.length > 0 ? Math.min(...data.spots.map((spot) => spot.A)) : null;
        setSelectedDomain(minDomain);
      } catch (err) {
        if (!isActive) {
          return;
        }

        setComparisonData(null);
        setSelectedDomain(null);
        setError(err instanceof Error ? err.message : 'Failed to load domain comparison data.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadDomainComparison();

    return () => {
      isActive = false;
    };
  }, [selectedToolA, selectedToolB, selectedDataset]);

  const selectedToolNames = useMemo(
    () => ({
      a: comparisonData?.experiments.A.tool_name ?? selectedToolA?.tool_name ?? 'Tool A',
      b: comparisonData?.experiments.B.tool_name ?? selectedToolB?.tool_name ?? 'Tool B',
    }),
    [comparisonData, selectedToolA?.tool_name, selectedToolB?.tool_name],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="tool-a-select-label">Tool A</InputLabel>
          <Select
            labelId="tool-a-select-label"
            value={selectedToolAId}
            label="Tool A"
            onChange={handleToolAChange}
          >
            {tools.map((tool) => (
              <MenuItem key={tool.experiment_id} value={tool.experiment_id} disabled={tool.experiment_id === selectedToolBId}>
                {tool.tool_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="tool-b-select-label">Tool B</InputLabel>
          <Select
            labelId="tool-b-select-label"
            value={selectedToolBId}
            label="Tool B"
            onChange={handleToolBChange}
          >
            {tools.map((tool) => (
              <MenuItem key={tool.experiment_id} value={tool.experiment_id} disabled={tool.experiment_id === selectedToolAId}>
                {tool.tool_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box
          sx={{
            py: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Loading domain comparison...
          </Typography>
        </Box>
      ) : comparisonData ? (
        <>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <DomainComparisonPlot
              data={comparisonData}
              selectedDomain={selectedDomain}
              onDomainSelect={setSelectedDomain}
            />
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Domain Metrics
            </Typography>
            <DomainMetricsTable
              domainMetrics={comparisonData.domain_metrics}
              toolAName={selectedToolNames.a}
              toolBName={selectedToolNames.b}
              selectedDomain={selectedDomain}
            />
          </Box>
        </>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Select two tools to render domain comparison.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default DomainComparisonTab;
