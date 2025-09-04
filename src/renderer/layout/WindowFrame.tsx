import React, { PropsWithChildren } from 'react';

// eslint-disable-next-line react/function-component-definition
const WindowFrame: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="p-5 h-screen w-screen">
      <div className="flex flex-col shadow-md overflow-clip rounded-lg h-full">
        {children}
      </div>
    </div>
  );
};

export default WindowFrame;
