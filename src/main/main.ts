import 'reflect-metadata';
import { container } from './inversify.config';
import { TYPES } from './container';

container.get(TYPES.Root);
