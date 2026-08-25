#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('gpx2wanderer')
  .description('Convert GPX tracks to Wanderer-compatible format with algorithmic waypoint generation')
  .version('0.1.0');

program
  .argument('<gpx-file>', 'Path to GPX file to process')
  .option('-v, --verbose', 'Enable verbose output for debugging', false)
  .option('-e, --epsilon <meters>', 'Douglas-Peucker simplification epsilon in meters', '30')
  .option('-t, --tolerance <meters>', 'Maximum divergence tolerance in meters', '50')
  .option('-i, --max-iterations <count>', 'Maximum Valhalla validation iterations', '10')
  .option('-o, --output <path>', 'Output GPX file path (default: <input>-wanderer.gpx)')
  .action(async (gpxFile: string, options: any) => {
    try {
      console.log(chalk.blue('gpx2wanderer v0.1.0'));
      console.log(chalk.gray(`Processing: ${gpxFile}`));
      
      if (options.verbose) {
        console.log(chalk.gray('Verbose mode enabled'));
        console.log(chalk.gray(`Epsilon: ${options.epsilon}m`));
        console.log(chalk.gray(`Tolerance: ${options.tolerance}m`));
        console.log(chalk.gray(`Max iterations: ${options.maxIterations}`));
      }

      // TODO: Implement GPX processing pipeline
      console.log(chalk.yellow('⚠️  GPX processing not yet implemented'));
      console.log(chalk.gray('This is a foundation scaffold. Implementation coming in next stories.'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
