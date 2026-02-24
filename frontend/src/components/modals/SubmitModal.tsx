import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Send, Science, Email, Schedule } from '@mui/icons-material';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

interface SubmitModalProps {
  open: boolean;
  onClose: () => void;
}

const SubmitModal: React.FC<SubmitModalProps> = ({ open, onClose }) => {
  const { experiments, submitExperiments } = useApp();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unsubmittedExperiments = experiments.filter((e) => e.status === 'not-submitted');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectInfo = await submitExperiments(email);
      
      setEmail('');
      setEmailError('');
      onClose();

      if (redirectInfo) {
        toast.success('Experiment submitted successfully! Opening job tracker in new tab...');
        // Open job status page in new tab so user can continue creating experiments
        const jobUrl = `${window.location.origin}/experiment/${redirectInfo.jobId}?t=${redirectInfo.accessToken}`;
        window.open(jobUrl, '_blank');
      } else {
        toast.error('No jobs were submitted');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit experiments');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Send sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Submit Experiments
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Experiments will be executed asynchronously on our servers. You'll receive an email notification when all
            analyses are complete.
          </Typography>
        </Alert>

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Experiments to Submit ({unsubmittedExperiments.length})
        </Typography>

        <List dense sx={{ mb: 2, bgcolor: '#F8FAFC', borderRadius: 1 }}>
          {unsubmittedExperiments.map((exp, index) => (
            <ListItem key={exp.id}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Science sx={{ fontSize: 20, color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText
                primary={exp.toolName}
                secondary={`${exp.parameters.n_clusters} clusters`}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          Notification Email
        </Typography>

        <TextField
          fullWidth
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError('');
          }}
          error={!!emailError}
          helperText={emailError}
          InputProps={{
            startAdornment: <Email sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
          }}
        />

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Estimated completion time: 5-15 minutes per experiment
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={isSubmitting ? <CircularProgress size={20} /> : <Send />}
          disabled={unsubmittedExperiments.length === 0 || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit All'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubmitModal;
