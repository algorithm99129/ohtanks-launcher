import React, { PropsWithChildren, useEffect } from 'react';

const AutoResizeLayout: React.FC<PropsWithChildren> = ({ children }) => {
  // useEffect(() => {
  //   const handleResize = () => {
  //     const height = document.body.clientHeight;
  //     window.electron.ipcRenderer.sendMessage('window:resize', { height });
  //   };

  //   const resizeObserver = new ResizeObserver(handleResize);
  //   resizeObserver.observe(document.body);

  //   return () => resizeObserver.disconnect();
  // }, []);

  return children;
};

export default AutoResizeLayout;
