import React, { PropsWithChildren } from 'react';

// eslint-disable-next-line react/function-component-definition
const WindowFrame: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="p-5">
      <div className="flex flex-col shadow-lg overflow-clip rounded-lg h-[400px]">
        {children}
      </div>
    </div>
  );
};

export default WindowFrame;
