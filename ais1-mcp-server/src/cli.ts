#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

import { resolveAgent } from './tools/resolve.js';
import { verifyBond } from './tools/verify.js';
import { listAgents } from './tools/list.js';
import { registerAgent } from './tools/register.js';
import { getSchema } from './tools/schema.js';
import { getSpec } from './tools/spec.js';

const program = new Command();

program
  .name('ais1')
  .description('CLI for the AIS-1 Agent Identity Standard registry')
  .version('1.0.0');

// ── resolve ──────────────────────────────────────────────────────────────────
program
  .command('resolve <identifier>')
  .description('Resolve an agent identity document')
  .action(async (identifier: string) => {
    try {
      const doc = await resolveAgent({ identifier });
      console.log(chalk.green.bold('Identity Document'));
      console.log(JSON.stringify(doc, null, 2));
    } catch (err) {
      console.error(chalk.red('Error:'), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── verify ───────────────────────────────────────────────────────────────────
program
  .command('verify <identifier>')
  .description('Verify the bond and assurance level of an agent')
  .action(async (identifier: string) => {
    try {
      const result = await verifyBond({ identifier });
      const statusColor = result.valid ? chalk.green : chalk.yellow;
      console.log(chalk.bold('Bond Verification'));
      console.log(`  Valid:    ${statusColor(String(result.valid))}`);
      console.log(`  Tier:     ${chalk.cyan(result.tier)}`);
      console.log(`  Bond TX:  ${result.bond_tx || chalk.gray('(none)')}`);
      console.log(`  Sponsor:  ${result.sponsor || chalk.gray('(none)')}`);
      console.log(`  Issued:   ${result.issued || chalk.gray('(none)')}`);
    } catch (err) {
      console.error(chalk.red('Error:'), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── list ─────────────────────────────────────────────────────────────────────
program
  .command('list')
  .description('List agents in the AIS-1 registry')
  .option('--limit <n>', 'Maximum number to return', '20')
  .option('--offset <n>', 'Number to skip', '0')
  .action(async (options: { limit: string; offset: string }) => {
    try {
      const agents = await listAgents({
        limit: parseInt(options.limit, 10),
        offset: parseInt(options.offset, 10),
      });
      if (agents.length === 0) {
        console.log(chalk.yellow('No agents found.'));
        return;
      }
      console.log(chalk.bold(`Found ${agents.length} agent(s):\n`));
      for (const a of agents) {
        console.log(
          `  ${chalk.cyan(a.identifier.padEnd(24))} ${chalk.white(a.name.padEnd(20))} ` +
            `${chalk.gray(a.type.padEnd(18))} tier=${chalk.yellow(a.tier)}`,
        );
      }
    } catch (err) {
      console.error(chalk.red('Error:'), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── register ──────────────────────────────────────────────────────────────────
program
  .command('register')
  .description('Submit a registration request for a new agent')
  .requiredOption('--name <name>', 'Human-readable agent name')
  .requiredOption('--type <type>', 'Agent type (e.g. FinancialAgent)')
  .requiredOption('--sponsor <did>', 'Sponsor DID')
  .requiredOption('--capabilities <list>', 'Comma-separated capability list')
  .requiredOption('--contact <email>', 'Contact email or URL')
  .action(
    async (options: {
      name: string;
      type: string;
      sponsor: string;
      capabilities: string;
      contact: string;
    }) => {
      try {
        const result = await registerAgent({
          name: options.name,
          type: options.type,
          sponsor_did: options.sponsor,
          capabilities: options.capabilities.split(',').map((s) => s.trim()),
          contact: options.contact,
        });
        console.log(chalk.green.bold('Registration Submitted'));
        console.log(`  Request ID: ${chalk.cyan(result.request_id)}`);
        console.log(`  Status:     ${chalk.yellow(result.status)}`);
        console.log(`  Next steps: ${result.instructions}`);
      } catch (err) {
        console.error(chalk.red('Error:'), err instanceof Error ? err.message : err);
        process.exit(1);
      }
    },
  );

// ── schema ────────────────────────────────────────────────────────────────────
program
  .command('schema')
  .description('Fetch the AIS-1 v0.2 JSON schema')
  .action(async () => {
    try {
      const schema = await getSchema();
      console.log(chalk.bold('AIS-1 v0.2 Schema'));
      console.log(JSON.stringify(schema, null, 2));
    } catch (err) {
      console.error(chalk.red('Error:'), err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── spec ──────────────────────────────────────────────────────────────────────
program
  .command('spec')
  .description('Show the AIS-1 standard specification summary')
  .action(() => {
    const spec = getSpec();
    console.log(chalk.bold.blue('AIS-1 Agent Identity Standard'));
    console.log(`  Version:   ${chalk.cyan(spec.version)}`);
    console.log(`  Publisher: ${spec.publisher}`);
    console.log(`  Licence:   ${spec.licence}`);
    console.log(`  Purpose:   ${spec.purpose}`);
    console.log(`  DID Method: ${chalk.cyan(spec.did_method)}`);
    console.log(chalk.bold('\nTiers:'));
    for (const [tier, desc] of Object.entries(spec.tiers)) {
      console.log(`  ${chalk.yellow(tier.padEnd(12))} ${desc}`);
    }
    console.log(chalk.bold('\nLinks:'));
    for (const [label, url] of Object.entries(spec.links)) {
      console.log(`  ${chalk.gray(label.padEnd(10))} ${chalk.underline(url)}`);
    }
  });

program.parse(process.argv);
