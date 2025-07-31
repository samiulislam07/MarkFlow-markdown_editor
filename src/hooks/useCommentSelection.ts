import { useState, useCallback } from 'react';
import { CommentButtonState } from '@/types/comment';

// This hook now simply manages the state of the floating comment button.
// The logic for detecting a selection has been moved into the editor component,
// where it can be more reliably handled by CodeMirror.

export function useCommentSelection() {
  const [commentButtonState, setCommentButtonState] = useState<CommentButtonState>({
    isVisible: false,
    selectedText: '',
    position: { x: 0, y: 0 },
    selection: { from: 0, to: 0 },
  });

  const showCommentButton = useCallback((text: string, position: { x: number; y: number }, selection: { from: number; to: number }) => {
    setCommentButtonState({
      isVisible: true,
      selectedText: text,
      position,
      selection,
    });
  }, []);

  const dismissCommentButton = useCallback(() => {
    setCommentButtonState(prevState => ({ ...prevState, isVisible: false }));
  }, []);

  return {
    commentButtonState,
    showCommentButton,
    dismissCommentButton,
  };
}
