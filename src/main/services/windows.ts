import { BrowserWindow, app, screen, shell } from 'electron';
import path from 'path';
import { getAssetPath, resolveHtmlPath } from '../utils';
import { injectable } from 'inversify';

const DEFAULT_WINDOW_OPTIONS: Electron.BrowserWindowConstructorOptions = {
  show: false,
  center: true,
  frame: false,
  transparent: true,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: app.isPackaged
      ? path.join(__dirname, './preload.js')
      : path.join(__dirname, '../../.erb/dll/preload.js'),
  },
};

@injectable()
class Window {
  private window: BrowserWindow | null = null;
  private preMaximizeSize: [number, number] | null = null;
  private draggedAfterMaximize: boolean = false;

  constructor(
    private windowOptions: Partial<Electron.BrowserWindowConstructorOptions>,
    private htmlPath: string,
  ) {}

  private attachCustomEventHandlers() {
    if (!this.window) return;

    this.window.on('will-resize', (event, newBounds) => {
      if (this.window && !this.window.isMaximized()) {
        const [width, height] = this.window.getSize();
        this.preMaximizeSize = [width, height];
      }
    });

    this.window.on('maximize', () => {
      this.draggedAfterMaximize = false;
    });

    this.window.on('unmaximize', () => {
      this.draggedAfterMaximize = false;
    });

    this.window.on('will-move', (event) => {
      if (
        this.window &&
        this.window.isMaximized() &&
        !this.draggedAfterMaximize &&
        this.preMaximizeSize
      ) {
        event.preventDefault();

        const cursorPosition = screen.getCursorScreenPoint();
        const windowBounds = this.window.getBounds();

        const relativeX =
          (cursorPosition.x - windowBounds.x) / windowBounds.width;
        const relativeY =
          (cursorPosition.y - windowBounds.y) / windowBounds.height;

        const newPositionX =
          cursorPosition.x - this.preMaximizeSize[0] * relativeX;
        const newPositionY =
          cursorPosition.y - this.preMaximizeSize[1] * relativeY;

        this.window.unmaximize();

        this.window.setSize(...this.preMaximizeSize);
        this.window.setPosition(
          Math.round(newPositionX),
          Math.round(newPositionY),
        );

        this.draggedAfterMaximize = true;
        this.window?.webContents.send('unmaximized');
      }
    });

    this.window.webContents.setWindowOpenHandler((edata) => {
      shell.openExternal(edata.url);
      return { action: 'deny' };
    });
  }

  public create() {
    if (this.window) {
      this.window.show();
      return;
    }

    const finalWindowOptions: Electron.BrowserWindowConstructorOptions = {
      ...DEFAULT_WINDOW_OPTIONS,
      ...this.windowOptions,
      webPreferences: {
        ...DEFAULT_WINDOW_OPTIONS.webPreferences,
        ...this.windowOptions.webPreferences,
      },
    };

    this.window = new BrowserWindow(finalWindowOptions);

    this.window.loadURL(resolveHtmlPath(this.htmlPath));

    this.window.on('ready-to-show', () => {
      if (!this.window) {
        throw new Error('"window" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        this.window.minimize();
      } else {
        this.window.show();
      }
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    this.attachCustomEventHandlers();
    this.window.setMenu(null);
  }

  public get(): BrowserWindow {
    if (this.window === null) {
      throw new Error('Window is not defined.');
    }
    return this.window;
  }

  public destroy() {
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }

  public send<T>(channel: string, data: T) {
    if (this.window) this.window.webContents.send(channel, data);
  }
}

export default Window;

export const createMainWindow = () => {
  return new Window(
    {
      width: 500,
      height: 500,
      icon: getAssetPath('icon.png'),
      minWidth: 500,
      maxWidth: 500,
      minHeight: 500,
      maxHeight: 500,
    },
    'index.html',
  );
};
