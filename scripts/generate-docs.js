#!/usr/bin/env node

/**
 * Script to generate TypeScript type definitions and API documentation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Ensure the dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

console.log('Building TypeScript project...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Generating TypeScript declaration files...');
execSync('tsc --declaration --emitDeclarationOnly --outDir dist', { stdio: 'inherit' });

console.log('Copying API documentation...');
fs.copyFileSync('API.md', path.join('dist', 'API.md'));

console.log('Documentation generation complete!');