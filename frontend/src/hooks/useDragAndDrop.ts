import { useState } from 'react';

interface UseDragAndDropReturn {
  draggedJobId: string | null;
  dragOverJobId: string | null;
  isDragging: (jobId: string) => boolean;
  isDragOver: (jobId: string) => boolean;
  handleDragStart: (jobId: string) => void;
  handleDragOver: (e: React.DragEvent, jobId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, dropJobId: string, onDrop: (draggedId: string, dropId: string) => void) => void;
  handleDragEnd: () => void;
}

/**
 * Custom hook for managing drag-and-drop state and handlers
 * Handles dragging items by their ID and provides visual feedback
 */
export function useDragAndDrop(): UseDragAndDropReturn {
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverJobId, setDragOverJobId] = useState<string | null>(null);

  const handleDragStart = (jobId: string) => {
    setDraggedJobId(jobId);
  };

  const handleDragOver = (e: React.DragEvent, jobId: string) => {
    e.preventDefault();
    setDragOverJobId(jobId);
  };

  const handleDragLeave = () => {
    setDragOverJobId(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    dropJobId: string,
    onDrop: (draggedId: string, dropId: string) => void
  ) => {
    e.preventDefault();

    if (!draggedJobId || draggedJobId === dropJobId) {
      setDraggedJobId(null);
      setDragOverJobId(null);
      return;
    }

    // Call the provided onDrop callback with the dragged and drop IDs
    onDrop(draggedJobId, dropJobId);

    // Reset state
    setDraggedJobId(null);
    setDragOverJobId(null);
  };

  const handleDragEnd = () => {
    setDraggedJobId(null);
    setDragOverJobId(null);
  };

  const isDragging = (jobId: string) => draggedJobId === jobId;
  const isDragOver = (jobId: string) => dragOverJobId === jobId;

  return {
    draggedJobId,
    dragOverJobId,
    isDragging,
    isDragOver,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
