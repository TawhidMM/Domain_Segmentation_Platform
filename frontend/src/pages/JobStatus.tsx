import React, { useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Copy, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';
import { useJobTracking } from '@/hooks/useJobTracking';
import SpatialPlot from '@/components/visualization/SpatialPlot';
import { toast } from 'sonner';

const JobStatus: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('t');

  const { status, result, metrics, isLoading, isPolling, error, errorCode } = useJobTracking(
    jobId || '',
    accessToken
  );

  const copyLink = useCallback(() => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl).then(() => {
      toast.success('Link copied to clipboard!');
    });
  }, []);

  const getStatusColor = (stat: string | null): 'warning' | 'info' | 'success' | 'error' | 'default' => {
    switch (stat) {
      case 'queued':
        return 'warning';
      case 'running':
        return 'info';
      case 'finished':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (stat: string | null): React.ReactElement | null => {
    switch (stat) {
      case 'queued':
        return <Clock size={16} />;
      case 'running':
        return <Zap size={16} />;
      case 'finished':
        return <CheckCircle size={16} />;
      case 'failed':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  // Invalid access link
  if (!accessToken || !jobId) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Invalid Access Link
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            The job access link is missing required parameters. Please check the URL and try again.
          </Typography>
          <Button variant="contained" href="/">
            Return to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  // Error states
  if (error && errorCode) {
    if (errorCode === 403) {
      return (
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Unauthorized Access
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              You don't have permission to access this job. The access token may be invalid or expired.
            </Typography>
            <Button variant="contained" href="/">
              Return to Home
            </Button>
          </Paper>
        </Container>
      );
    }

    if (errorCode === 404) {
      return (
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 16 }} />
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Job Not Found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              The job you're looking for doesn't exist or has expired.
            </Typography>
            <Button variant="contained" href="/">
              Return to Home
            </Button>
          </Paper>
        </Container>
      );
    }

    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {error}
          </Typography>
        </Alert>
        <Button variant="contained" href="/">
          Return to Home
        </Button>
      </Container>
    );
  }

  // Loading state
  if (isLoading && !status) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Loading job status...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Job Status
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Tracking results for job <code>{jobId}</code>
        </Typography>

        {/* Status Chip and Copy Link */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {status && getStatusIcon(status) && (
            <Chip
              icon={getStatusIcon(status) as React.ReactElement}
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              color={getStatusColor(status) as any}
              variant="outlined"
            />
          )}

          {isPolling && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Polling for updates...
            </Typography>
          )}

          <Tooltip title="Copy job link">
            <Button
              startIcon={<Copy size={16} />}
              variant="outlined"
              size="small"
              onClick={copyLink}
            >
              Copy Link
            </Button>
          </Tooltip>
        </Box>

        {/* Share Instructions */}
        {status && (status === 'queued' || status === 'running') && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Job is processing...
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              You can share or bookmark the link above to check back on progress anytime. The link remains valid until the job completes.
            </Typography>
          </Alert>
        )}

        {status === 'finished' && (
          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Job completed successfully!
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Results are displayed below. You can bookmark this link to revisit results anytime.
            </Typography>
          </Alert>
        )}

        {status === 'failed' && (
          <Alert severity="error" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Job failed to complete
            </Typography>
          </Alert>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Results Section */}
      {status === 'finished' && result ? (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Results
          </Typography>
          <SpatialPlot result={result} metrics={metrics} title="Spatial Domain Analysis" height={600} />
        </Box>
      ) : status === 'queued' || status === 'running' ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={56} sx={{ mb: 3 }} />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
            {status === 'queued' ? 'Job is queued' : 'Job is running'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {status === 'queued'
              ? 'Your job is waiting to be processed. This page will update automatically.'
              : 'Your job is being processed. This page will update automatically.'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Checking for updates every 5 seconds...
          </Typography>
        </Box>
      ) : status === 'failed' ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AlertCircle size={56} style={{ color: '#EF4444', marginBottom: 24 }} />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
            Job Failed
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            The job encountered an error during processing. Please try again or contact support if the problem persists.
          </Typography>
          <Button variant="contained" href="/">
            Create New Job
          </Button>
        </Box>
      ) : null}
    </Container>
  );
};

export default JobStatus;
