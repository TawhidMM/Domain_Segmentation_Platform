import { useCallback, useState } from 'react';

interface HistoryStep {
  // Store only the indices that actually changed and their OLD values
  // This allows "Undo" by simply reapplying the old values to these indices.
  changes: Map<number, number>;
}

const MAX_HISTORY = 50;

interface UseAnnotationHistoryConfig {
  annotationBuffer: Uint8Array;
  onAnnotationMutated: () => void;
}

export function useAnnotationHistory({ annotationBuffer, onAnnotationMutated }: UseAnnotationHistoryConfig) {
  const [undoStack, setUndoStack] = useState<HistoryStep[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryStep[]>([]);

  const recordStroke = useCallback(
    (changes: Map<number, number>) => {
      if (changes.size === 0) {
        return;
      }

      setUndoStack((prevStack) => {
        const nextStack = [{ changes }, ...prevStack];
        // Limit stack depth
        return nextStack.slice(0, MAX_HISTORY);
      });

      // Clear redo stack when new action is recorded
      setRedoStack([]);
    },
    [],
  );

  const executeUndo = useCallback(() => {
    setUndoStack((prevUndoStack) => {
      if (prevUndoStack.length === 0) {
        return prevUndoStack;
      }

      const [step, ...remainingUndo] = prevUndoStack;
      const redoStep = new Map<number, number>();

      // Iterate through the changes in the step
      for (const [index, oldValue] of step.changes.entries()) {
        // Save the current value into the redoStep (for Redo purposes)
        redoStep.set(index, annotationBuffer[index] ?? 0);

        // Write the stored value from the step back into the annotationBuffer
        annotationBuffer[index] = oldValue;
      }

      // Push the redoStep to the redoStack
      setRedoStack((prevRedoStack) => [{ changes: redoStep }, ...prevRedoStack]);

      // Trigger version bump to refresh the Deck.gl layer
      onAnnotationMutated();

      return remainingUndo;
    });
  }, [annotationBuffer, onAnnotationMutated]);

  const executeRedo = useCallback(() => {
    setRedoStack((prevRedoStack) => {
      if (prevRedoStack.length === 0) {
        return prevRedoStack;
      }

      const [step, ...remainingRedo] = prevRedoStack;
      const undoStep = new Map<number, number>();

      // Iterate through the changes in the step
      for (const [index, newValue] of step.changes.entries()) {
        // Save the current value into the undoStep (for Undo purposes)
        undoStep.set(index, annotationBuffer[index] ?? 0);

        // Write the stored value from the step into the annotationBuffer
        annotationBuffer[index] = newValue;
      }

      // Push the undoStep to the undoStack
      setUndoStack((prevUndoStack) => [{ changes: undoStep }, ...prevUndoStack]);

      // Trigger version bump to refresh the Deck.gl layer
      onAnnotationMutated();

      return remainingRedo;
    });
  }, [annotationBuffer, onAnnotationMutated]);

  return {
    undoStack,
    redoStack,
    recordStroke,
    executeUndo,
    executeRedo,
  };
}
