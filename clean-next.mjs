#!/usr/bin/env node

import { rmSync } from 'fs';
import { resolve } from 'path';

const nextDir = resolve('.next');

try {
  rmSync(nextDir, { recursive: true, force: true });
  console.log(`Removed ${nextDir}`);
} catch (error) {
  console.error(`Failed to remove ${nextDir}: ${error.message}`);
  process.exit(1);
}
