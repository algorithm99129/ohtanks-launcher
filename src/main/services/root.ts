import { inject, injectable } from 'inversify';
import { BrowserWindow, IpcMainEvent, app, ipcMain } from 'electron';
import { installExtensions, isDebug } from '../util';
import AppUpdater from './updater';
import { TYPES } from '../container';
import Window from './windows';

@injectable()
class Root {
  constructor(@inject(TYPES.MainWindow) private readonly mainWindow: Window) {
    this.registerIpcHandlers();
  }

  /**
   * Register IPC handlers to manage window operations and application events
   */
  private registerIpcHandlers() {
    app.whenReady().then(this.onReady.bind(this)).catch(console.log);

    /**
     * Handles the resizing of a window based on provided width and height values.
     * This function is triggered by an IPC event. It will only resize the window
     * if it is not currently maximized, allowing for dynamic adjustments while
     * preserving user's maximization preference.
     *
     * @param event - The IPC event triggering the resize.
     * @param args - An object containing optional width and height properties.
     */
    const resizeWindowFromValue = (
      event: IpcMainEvent,
      args: { width?: number; height?: number },
    ): void => {
      const { width, height } = args;
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      if (senderWindow && !senderWindow.isMaximized()) {
        if (typeof width === 'number') {
          senderWindow.setSize(width, senderWindow.getSize()[1]);
        }
        if (typeof height === 'number') {
          senderWindow.setSize(senderWindow.getSize()[0], height);
        }
      }
    };

    ipcMain.on('window:resize', resizeWindowFromValue.bind(this));
  }

  /**
   * Initializes the application upon readiness. This includes setting up source map support in production,
   * enabling electron debug and installing extensions in debug mode, setting the default protocol client,
   * creating the main window and tray, and registering global shortcuts and application event listeners.
   */
  private async onReady() {
    // Install source map support in production for better error tracking.
    if (process.env.NODE_ENV === 'production') {
      try {
        const sourceMapSupport = await import('source-map-support');
        sourceMapSupport.install();
      } catch (error) {
        console.error('Source map support installation failed:', error);
      }
    }

    // Enable debugging and install extensions if in debug mode.
    if (isDebug) {
      try {
        const electronDebug = await import('electron-debug');
        electronDebug.default();
        await installExtensions();
      } catch (error) {
        console.error('Debug extensions installation failed:', error);
      }
    }

    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
    }

    this.mainWindow.create();

    // eslint-disable-next-line no-new
    new AppUpdater();
  }
}

export default Root;
