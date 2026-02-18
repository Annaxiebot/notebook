import type { EditorMode } from '../../types';

interface ToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  penColor: string;
  onPenColorChange: (color: string) => void;
  penSize: number;
  onPenSizeChange: (size: number) => void;
}

const PEN_COLORS = [
  '#1f2937', // near-black
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ffffff', // white
];

export default function Toolbar({
  mode,
  onModeChange,
  penColor,
  onPenColorChange,
  penSize,
  onPenSizeChange,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
      {/* Mode buttons */}
      <div className="flex items-center gap-1 mr-3">
        <ToolButton
          active={mode === 'text'}
          onClick={() => onModeChange('text')}
          title="Text mode"
        >
          T
        </ToolButton>
        <ToolButton
          active={mode === 'draw'}
          onClick={() => onModeChange('draw')}
          title="Draw / Handwrite"
        >
          ✏️
        </ToolButton>
        <ToolButton
          active={mode === 'photo'}
          onClick={() => onModeChange('photo')}
          title="Insert photo"
        >
          📷
        </ToolButton>
        <ToolButton
          active={mode === 'erase'}
          onClick={() => onModeChange('erase')}
          title="Erase"
        >
          🗑
        </ToolButton>
      </div>

      {/* Pen options (only show when in draw/erase mode) */}
      {(mode === 'draw' || mode === 'erase') && (
        <>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Color picker */}
          <div className="flex items-center gap-1">
            {PEN_COLORS.map(color => (
              <button
                key={color}
                onClick={() => { onModeChange('draw'); onPenColorChange(color); }}
                style={{ backgroundColor: color }}
                className={`
                  w-5 h-5 rounded-full border transition-transform flex-shrink-0
                  ${penColor === color && mode === 'draw' ? 'scale-125 border-indigo-400 shadow-sm' : 'border-gray-200 hover:scale-110'}
                `}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Size picker */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 4].map(size => (
              <button
                key={size}
                onClick={() => onPenSizeChange(size)}
                className={`
                  flex items-center justify-center w-7 h-7 rounded-lg transition-colors
                  ${penSize === size ? 'bg-indigo-100' : 'hover:bg-gray-100'}
                `}
                title={`Size ${size}`}
              >
                <div
                  style={{
                    width: size * 3 + 3,
                    height: size * 3 + 3,
                    backgroundColor: penColor,
                    borderRadius: '50%',
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
        ${active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100'
        }
      `}
    >
      {children}
    </button>
  );
}
