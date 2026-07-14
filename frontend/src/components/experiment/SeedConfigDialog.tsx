import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
} from '@mui/material';
import { Close, Add } from '@mui/icons-material';

// Regex to allow only digits (positive integers)
const DIGITS_ONLY_REGEX = /^\d*$/;

interface SeedConfigDialogProps {
  open: boolean;
  onClose: () => void;
  seedList: number[];
  onSeedChange: (seeds: number[]) => void;
}

const MIN_RUNS = 1;
const MAX_RUNS = 20;

export const SeedConfigDialog: React.FC<SeedConfigDialogProps> = ({
  open,
  onClose,
  seedList,
  onSeedChange,
}) => {
  // Local state for editing - allows empty/invalid inputs while user is typing
  const [localSeeds, setLocalSeeds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const seedListRef = useRef<HTMLDivElement>(null);

  // Initialize local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalSeeds(seedList.map(String));
      setErrors({});
    }
  }, [open, seedList]);

  const validateSeed = (value: string): string | null => {
    if (value === '' || value === null) return 'Seed is required';
    const num = Number(value);
    if (isNaN(num)) return 'Must be a valid integer';
    if (!Number.isInteger(num)) return 'Must be an integer';
    if (num <= 0) return 'Must be positive';
    return null;
  };

  const handleSeedChange = (index: number, value: string) => {
    // Filter: allow only digits (prevents letters, decimals, etc.)
    if (!DIGITS_ONLY_REGEX.test(value)) {
      return;
    }
    
    const newSeeds = [...localSeeds];
    newSeeds[index] = value;
    setLocalSeeds(newSeeds);

    // Validate immediately for feedback
    const error = validateSeed(value);
    setErrors((prev) => ({
      ...prev,
      [index]: error || undefined,
    }));
  };

  const handleAddSeed = () => {
    if (localSeeds.length < MAX_RUNS) {
      const currentIndex = localSeeds.length;
      setLocalSeeds([...localSeeds, '']);
      setErrors((prev) => ({ ...prev, [currentIndex]: 'Seed is required' }));
      
      // Auto-scroll to show the new row
      setTimeout(() => {
        if (seedListRef.current) {
          seedListRef.current.scrollTop = seedListRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  const handleRemoveSeed = (index: number) => {
    if (localSeeds.length > MIN_RUNS) {
      const newSeeds = localSeeds.filter((_, i) => i !== index);
      setLocalSeeds(newSeeds);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        // Re-index remaining errors
        const reordered: Record<number, string> = {};
        newSeeds.forEach((_, i) => {
          if (prev[i + (i >= index ? 1 : 0)] !== undefined) {
            reordered[i] = prev[i + (i >= index ? 1 : 0)];
          }
        });
        return reordered;
      });
    }
  };

  const allSeedsValid = () => {
    const allValid = localSeeds.every((seed, index) => !errors[index]);
    return allValid && localSeeds.length >= MIN_RUNS;
  };

  const handleDone = () => {
    // Convert to numbers and save
    const numericSeeds = localSeeds.map((s) => Number(s));
    onSeedChange(numericSeeds);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Configure Experiment Runs
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
          {/* Header row with Number of Runs and Add Run button */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Number of Runs
              </Typography>
              <Chip
                label={`${localSeeds.length} run${localSeeds.length !== 1 ? 's' : ''}`}
                size="small"
                color={localSeeds.length === 0 ? 'error' : 'primary'}
                variant="outlined"
              />
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={handleAddSeed}
              disabled={localSeeds.length >= MAX_RUNS}
              sx={{ 
                textTransform: 'none',
                py: 0.35,
                px: 1,
              }}
            >
              Add Run
            </Button>
          </Box>

          {/* Scrollable seed list - fixed height */}
          <Box 
            ref={seedListRef}
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1, 
              height: 320,
              minHeight: 320,
              overflow: 'auto' 
            }}
          >
            {localSeeds.map((seed, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    minWidth: 50,
                    color: 'text.secondary',
                    fontWeight: 500,
                    pt: 1,
                  }}
                >
                  Run {index + 1}
                </Typography>
                <TextField
                  type="text"
                  value={seed}
                  onChange={(e) => handleSeedChange(index, e.target.value)}
                  error={!!errors[index]}
                  helperText={errors[index] || ' '}
                  size="small"
                  sx={{ flex: 1 }}
                  placeholder="Enter seed value"
                />
                <IconButton
                  size="small"
                  onClick={() => handleRemoveSeed(index)}
                  disabled={localSeeds.length <= MIN_RUNS}
                  color="error"
                  sx={{ p: 0.5, mt: 0.5 }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>

          {!allSeedsValid() && (
            <Typography variant="caption" sx={{ color: 'error.main' }}>
              All seed values must be valid positive integers
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleDone}
          variant="contained"
          disabled={!allSeedsValid()}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeedConfigDialog;