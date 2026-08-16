import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { DomainMetric } from './types';

interface DomainMetricsTableProps {
  domainMetrics: DomainMetric[];
  toolAName: string;
  toolBName: string;
  selectedDomain: number | null;
  onDomainSelect: (domain: number) => void;
}

const DomainMetricsTable: React.FC<DomainMetricsTableProps> = ({
  domainMetrics,
  toolAName,
  toolBName,
  selectedDomain,
  onDomainSelect,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        bgcolor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: 'grey.100',
      }}
    >
      <TableContainer sx={{ flex: 1, minHeight: 0, overflowX: 'auto' }}>
        <Table size="small" stickyHeader sx={{ minWidth: 600 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  bgcolor: '#f8f9fb',
                  fontWeight: 700,
                  color: 'grey.800',
                  borderBottom: '2px solid',
                  borderColor: 'grey.300',
                  py: 2,
                  minWidth: 110,
                }}
              >
                Domain
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  bgcolor: '#f8f9fb',
                  fontWeight: 700,
                  color: 'grey.800',
                  borderBottom: '2px solid',
                  borderColor: 'grey.300',
                  py: 2,
                }}
              >
                Intersection
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  bgcolor: '#f8f9fb',
                  fontWeight: 700,
                  color: 'grey.800',
                  borderBottom: '2px solid',
                  borderColor: 'grey.300',
                  py: 2,
                }}
              >
                {toolAName} only
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  bgcolor: '#f8f9fb',
                  fontWeight: 700,
                  color: 'grey.800',
                  borderBottom: '2px solid',
                  borderColor: 'grey.300',
                  py: 2,
                }}
              >
                {toolBName} only
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  bgcolor: '#f8f9fb',
                  fontWeight: 700,
                  color: 'grey.800',
                  borderBottom: '2px solid',
                  borderColor: 'grey.300',
                  py: 2,
                }}
              >
                Jaccard
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {domainMetrics.map((row) => {
              const isSelected = selectedDomain === row.domain;

              return (
                <TableRow
                  key={row.domain}
                  hover
                  role="button"
                  tabIndex={0}
                  onClick={() => onDomainSelect(row.domain)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onDomainSelect(row.domain);
                    }
                  }}
                  sx={{
                    bgcolor: isSelected ? '#EAF2FF' : 'white',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isSelected ? '#E3EEFF' : 'rgba(0, 0, 0, 0.02)',
                    },
                    '& td': {
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                    },
                  }}
                >
                  <TableCell sx={{ py: 1.5, fontWeight: isSelected ? 700 : 600, color: 'grey.900' }}>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: isSelected ? '#D7E7FF' : '#F3F4F6',
                        minWidth: 36,
                        textAlign: 'center',
                      }}
                    >
                      {row.domain}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5, fontVariantNumeric: 'tabular-nums', fontFamily: '"Roboto Mono", monospace' }}>
                    {row.intersection}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5, fontVariantNumeric: 'tabular-nums', fontFamily: '"Roboto Mono", monospace' }}>
                    {row.expA_only}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5, fontVariantNumeric: 'tabular-nums', fontFamily: '"Roboto Mono", monospace' }}>
                    {row.expB_only}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5, fontVariantNumeric: 'tabular-nums', fontFamily: '"Roboto Mono", monospace', fontWeight: isSelected ? 700 : 500 }}>
                    {row.jaccard.toFixed(4)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {domainMetrics.length === 0 && (
        <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
          No domain metrics available.
        </Typography>
      )}
    </Paper>
  );
};

export default DomainMetricsTable;
