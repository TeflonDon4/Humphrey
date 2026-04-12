#!/usr/bin/env node
'use strict';

const { version } = require('../package.json');

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
ais1 - AI Services CLI v${version}

Usage:
  ais1 <command> [options]

Commands:
  help       Show this help message
  version    Show version number

Examples:
  ais1 help
  ais1 version
`);
}

switch (command) {
  case undefined:
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;

  case 'version':
  case '--version':
  case '-v':
    console.log(version);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
