import { useRef, useEffect } from 'react';
import type { TextBlock as TextBlockType } from '../../types';

interface TextBlockProps {
  block: TextBlockType;
  onChange: (content: string) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}

export default function TextBlock({ block, onChange, onEnter, autoFocus }: TextBlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  const handleInput = () => {
    if (ref.current) {
      onChange(ref.current.innerText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Shift+Enter: line break (default behavior)
    // Enter alone: could signal "done" or create new block
    if (e.key === 'Enter' && !e.shiftKey && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      className="w-full min-h-[2.5em] px-4 py-2 text-gray-800 text-base leading-relaxed outline-none focus:bg-gray-50/50 rounded-lg transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
      data-placeholder="Start typing..."
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {block.content}
    </div>
  );
}
