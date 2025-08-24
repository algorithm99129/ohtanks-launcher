import { Container } from 'inversify';
import { TYPES } from './container';
import Root from './services/root';
import Window, { createMainWindow } from './services/windows';

const mainWindow = createMainWindow();

const container = new Container();
container.bind<Window>(TYPES.MainWindow).toConstantValue(mainWindow);
container.bind<Root>(TYPES.Root).to(Root).inSingletonScope();

export { container };
