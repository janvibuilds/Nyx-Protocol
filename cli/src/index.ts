#!/usr/bin/env node

import { Command } from 'commander';
import { registerRunCommand } from './commands/run';

const program = new Command();

program
  .name('darkpool')
  .description('Midnight Dark Pool CLI - DevRel tools and SDK')
  .version('0.1.0');

registerRunCommand(program);

program.parse(process.argv);
