import 'reflect-metadata';

import { Application } from './src/core/application/Application.js';


async function bootstrap() {
  try {
    const app = new Application();
    
    return app;
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
