import { useEffect, useState } from 'react';
import { RxCross1 } from 'react-icons/rx';
import { BsDiscord } from 'react-icons/bs';
import WindowFrame from '../layout/WindowFrame';
import { GameHUD } from '../lib/constants';

const Loader = () => {
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on(
      'status_message',
      (message) => {
        setMessage(message as string);
      },
    );

    // Send message to main for window ready status
    window.electron.ipcRenderer.sendMessage('window:ready');

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <WindowFrame>
      <div className="relative bg-black h-full">
        <img src={GameHUD} alt="OhTanks HUD" />
        <header className="absolute left-0 top-0 w-full flex items-center justify-end font-mono p-1 gap-1">
          <button
            className="w-[40px] h-[40px] flex items-center justify-center hover:bg-blue-500/90 text-white transition-all duration-150 rounded-lg"
            title="Discord"
            onClick={() =>
              window.electron.ipcRenderer.sendMessage(
                'open-external',
                'https://discord.gg/3XSGag74Aq',
              )
            }
          >
            <BsDiscord />
          </button>
          <button
            className="w-[40px] h-[40px] flex items-center justify-center hover:bg-red-500/90 text-white transition-all duration-150 rounded-lg"
            title="Close"
            onClick={() => window.electron.ipcRenderer.sendMessage('app:close')}
          >
            <RxCross1 />
          </button>
        </header>
        <div className="absolute left-0 bottom-[50px] w-full h-[40px] flex items-center justify-center text-red-700 bg-white/60 font-mono backdrop-blur">
          {message}
        </div>
        <footer className="absolute left-0 bottom-0 w-full h-[50px] flex items-center justify-center">
          <span
            className="text-white cursor-pointer hover:underline transition-colors duration-200 font-mono text-sm"
            onClick={() =>
              window.electron.ipcRenderer.sendMessage(
                'open-external',
                'https://www.ohtanks.com',
              )
            }
          >
            &copy; {new Date().getFullYear()} KittyHome
          </span>
        </footer>
      </div>
    </WindowFrame>
  );
};

export default Loader;
