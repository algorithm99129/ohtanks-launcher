import React, { PropsWithChildren } from 'react';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}

// eslint-disable-next-line react/function-component-definition
const WindowFrame: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="h-screen w-screen">
      <div className="flex flex-col shadow-md overflow-clip h-full w-full">
        {/* Draggable area - covers the entire window except for interactive elements */}
        <div
          className="absolute inset-0 z-0 cursor-move"
          style={{
            WebkitAppRegion: 'drag',
            WebkitUserSelect: 'none',
          }}
        />
        {/* Content with higher z-index to be above draggable area */}
        <div className="relative z-10 h-full w-full p-5">
          <div className="w-full h-full relative rounded-lg overflow-clip shadow-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WindowFrame;
