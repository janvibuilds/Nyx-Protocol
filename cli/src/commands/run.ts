import { Command } from 'commander';
import { runSimulation } from '../simulate';

export function registerRunCommand(program: Command): void {
  program
    .command('simulate')
    .description('Run a multi-agent trade simulation with mock wallets (Alice & Bob)')
    .option('-H, --host <host>', 'Sequencer WebSocket host', 'localhost')
    .option('-p, --port <port>', 'Sequencer WebSocket port', '8081')
    .option('-o, --orders <count>', 'Number of order pairs to submit', '1')
    .action(async (opts) => {
      try {
        await runSimulation({
          host: opts.host,
          port: parseInt(opts.port, 10),
          orders: parseInt(opts.orders, 10),
        });
      } catch (err) {
        console.error(`Simulation failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
