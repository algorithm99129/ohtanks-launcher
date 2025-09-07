import { useEffect, useState } from 'react';
import { RxCross1 } from 'react-icons/rx';
import { BsDiscord } from 'react-icons/bs';
import { FaPlay } from 'react-icons/fa';
import WindowFrame from '../layout/WindowFrame';
import { GameHUD } from '../lib/constants';

const Loader = () => {
  const [message, setMessage] = useState<string>('');
  const [executablePath, setExecutablePath] = useState<string | null>(null);
  useEffect(() => {
    const statusMessageHandler = window.electron.ipcRenderer.on(
      'status_message',
      (message) => {
        setMessage(message as string);
      },
    );

    const executablePathHandler = window.electron.ipcRenderer.on(
      'executable_path',
      (path) => {
        setExecutablePath(path as string | null);
      },
    );

    // Send message to main for window ready status
    window.electron.ipcRenderer.sendMessage('window:ready');

    return () => {
      statusMessageHandler();
      executablePathHandler();
    };
  }, []);

  const handleLaunch = () => {
    if (executablePath) {
      window.electron.ipcRenderer.sendMessage(
        'launcher:launch',
        executablePath,
      );
    }
  };

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
        {executablePath && (
          <button
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 group w-[100px] h-[100px] flex items-center justify-center backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 rounded-full focus:outline-none focus:ring-4 focus:ring-white/30 hover:shadow-[0_0_50px_rgba(59,130,246,0.5)]"
            onClick={handleLaunch}
            title="Play OhTanks!"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {/* Glass overlay with animated gradient */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 via-cyan-400/20 to-purple-500/20 group-hover:from-blue-400/30 group-hover:via-cyan-300/30 group-hover:to-purple-400/30 transition-all duration-300" />

            {/* Animated shimmer effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

            {/* Inner glow ring */}
            <div className="absolute inset-2 rounded-full border border-white/30 group-hover:border-white/50 transition-all duration-300" />

            {/* Play icon with enhanced effects */}
            <FaPlay className="relative ml-2 z-10 text-white drop-shadow-2xl text-5xl group-hover:text-yellow-200 group-hover:drop-shadow-[0_0_20px_rgba(255,255,0,0.5)] transition-all duration-300 group-hover:scale-110" />

            {/* Floating particles effect */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div
                className="absolute top-2 left-2 w-1 h-1 bg-white/60 rounded-full animate-ping"
                style={{ animationDelay: '0s' }}
              />
              <div
                className="absolute top-4 right-3 w-1 h-1 bg-cyan-300/60 rounded-full animate-ping"
                style={{ animationDelay: '0.5s' }}
              />
              <div
                className="absolute bottom-3 left-4 w-1 h-1 bg-blue-300/60 rounded-full animate-ping"
                style={{ animationDelay: '1s' }}
              />
              <div
                className="absolute bottom-2 right-2 w-1 h-1 bg-purple-300/60 rounded-full animate-ping"
                style={{ animationDelay: '1.5s' }}
              />
            </div>
          </button>
        )}
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
