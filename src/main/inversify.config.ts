import { Container } from 'inversify';
import { TYPES } from './container';
import Root from './services/root';
import Window, { createMainWindow } from './services/windows';
import AppLauncher from './services/launcher';

const mainWindow = createMainWindow();

const container = new Container();
container.bind<Window>(TYPES.MainWindow).toConstantValue(mainWindow);
container.bind<Root>(TYPES.Root).to(Root).inSingletonScope();
container
  .bind<AppLauncher>(TYPES.AppLauncher)
  .to(AppLauncher)
  .inSingletonScope();

export { container };
