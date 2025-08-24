import React, { PropsWithChildren } from 'react';
import { cn } from '../lib/utils';

const WindowFrame: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="p-5">
      <div
        className={cn(
          'flex flex-col shadow-lg overflow-clip',
          'rounded-lg h-[900px]',
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default WindowFrame;
