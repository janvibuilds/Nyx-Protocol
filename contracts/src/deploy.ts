/**
 * Deployment script for Dark Pool contract
 *
 * Usage:
 *   tsx src/deploy.ts standalone   (local devnet, genesis wallet)
 *   tsx src/deploy.ts preprod      (public preprod testnet, funded wallet)
 *   tsx src/deploy.ts preview      (public preview testnet, funded wallet)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

// Polyfill WebSocket for Node.js BEFORE any SDK import
globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

// ---------------------------------------------------------------------------
// Tiny .env loader (no dotenv dependency)
// ---------------------------------------------------------------------------
function loadEnv(dirs: string[]) {
  for (const dir of dirs) {
    const envPath = path.join(dir, '.env');
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from repo root and contracts dir
loadEnv([path.resolve(__dirname, '..'), path.resolve(__dirname, '../..')]);

// ---------------------------------------------------------------------------
// SDK imports (after env loading and WebSocket polyfill)
// ---------------------------------------------------------------------------
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { type CoinPublicKey, type EncPublicKey, type FinalizedTransaction, LedgerParameters, ZswapSecretKeys, DustSecretKey, encodeCoinPublicKey } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type MidnightProvider, type UnboundTransaction, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { FluentWalletBuilder, type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { Contract } from '../obj/dark_pool/contract/index.js';

// ---------------------------------------------------------------------------
// Network configs
// ---------------------------------------------------------------------------
interface NetworkConfig {
  networkId: string;
  walletNetworkId: string;
  label: string;
  env: EnvironmentConfiguration;
}

const GENESIS_SEED = '0'.repeat(63) + '1';

const PROOF_SERVER = 'http://127.0.0.1:6300';

const NETWORKS: Record<string, NetworkConfig> = {
  standalone: {
    networkId: 'undeployed',
    walletNetworkId: 'undeployed',
    label: 'Local Devnet',
    env: {
      walletNetworkId: 'undeployed',
      networkId: 'undeployed',
      indexer: 'http://127.0.0.1:8088/api/v4/graphql',
      indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
      node: 'http://127.0.0.1:9944',
      nodeWS: 'ws://127.0.0.1:9944',
      proofServer: PROOF_SERVER,
      faucet: undefined,
    },
  },
  preview: {
    networkId: 'preview',
    walletNetworkId: 'preview',
    label: 'Preview Testnet',
    env: {
      walletNetworkId: 'preview',
      networkId: 'preview',
      indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
      indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      node: 'https://rpc.preview.midnight.network',
      nodeWS: 'wss://rpc.preview.midnight.network',
      proofServer: PROOF_SERVER,
      faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
    },
  },
  preprod: {
    networkId: 'preprod',
    walletNetworkId: 'preprod',
    label: 'Preprod Testnet',
    env: {
      walletNetworkId: 'preprod',
      networkId: 'preprod',
      indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
      indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
      node: 'https://rpc.preprod.midnight.network',
      nodeWS: 'wss://rpc.preprod.midnight.network',
      proofServer: PROOF_SERVER,
      faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
    },
  },
};

// ---------------------------------------------------------------------------
// Select network from CLI arg
// ---------------------------------------------------------------------------
const networkArg = (process.argv[2] ?? 'standalone').toLowerCase();
const config = NETWORKS[networkArg];

if (!config) {
  console.error(`Unknown network: ${networkArg}`);
  console.error(`Available: ${Object.keys(NETWORKS).join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// WalletProvider + MidnightProvider implementation
// ---------------------------------------------------------------------------
class MidnightWalletProvider implements WalletProvider, MidnightProvider {
  private readonly wallet: WalletFacade;
  private readonly zswapKeys: ZswapSecretKeys;
  private readonly dustKey: DustSecretKey;
  private readonly unshieldedKeystore: { getPublicKey(): unknown; signData(payload: Uint8Array): string };

  constructor(
    wallet: WalletFacade,
    zswapKeys: ZswapSecretKeys,
    dustKey: DustSecretKey,
    unshieldedKeystore: { getPublicKey(): unknown; signData(payload: Uint8Array): string },
  ) {
    this.wallet = wallet;
    this.zswapKeys = zswapKeys;
    this.dustKey = dustKey;
    this.unshieldedKeystore = unshieldedKeystore;
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapKeys.encryptionPublicKey;
  }

  async balanceTx(tx: UnboundTransaction, ttl: Date = ttlOneHour()): Promise<FinalizedTransaction> {
    const recipe = await this.wallet.balanceUnboundTransaction(
      tx,
      { shieldedSecretKeys: this.zswapKeys, dustSecretKey: this.dustKey },
      { ttl },
    );
    const signedRecipe = await this.wallet.signRecipe(recipe, (payload) =>
      this.unshieldedKeystore.signData(payload),
    );
    return this.wallet.finalizeRecipe(signedRecipe);
  }

  async submitTx(tx: FinalizedTransaction): Promise<string> {
    return this.wallet.submitTransaction(tx);
  }
}

// ---------------------------------------------------------------------------
// Main deploy function
// ---------------------------------------------------------------------------
async function deploy() {
  setNetworkId(config.networkId as 'undeployed' | 'preview' | 'preprod');

  console.log('');
  console.log(`  Network : ${config.label} (${config.networkId})`);
  console.log(`  Indexer : ${config.env.indexer}`);
  console.log(`  Proof   : ${config.env.proofServer}`);
  console.log(`  Node RPC: ${config.env.node}`);
  console.log('');

  // Resolve seed
  let seed: string;
  if (config.networkId === 'undeployed') {
    seed = GENESIS_SEED;
    console.log('Using genesis seed (local devnet)');
  } else {
    const envSeed = process.env.WALLET_SEED;
    if (!envSeed || envSeed.length < 40) {
      console.error(
        'WALLET_SEED not set or too short.\n' +
          'Generate one:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
          'Then add it to your .env file.',
      );
      process.exit(1);
    }
    seed = envSeed;
    console.log('Using WALLET_SEED from .env');
  }

  // Verify compiled contract exists
  const contractPath = path.join(__dirname, '../obj/dark_pool');
  if (!fs.existsSync(contractPath)) {
    console.error('Contract not compiled. Run: npm run compile');
    process.exit(1);
  }

  // Verify proof server is reachable (soft check — SDK will fail clearly if truly down)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${config.env.proofServer}/api/v1/health/zkConfig`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      console.log('Proof server: healthy');
    } else {
      console.warn(`Proof server returned HTTP ${resp.status} — continuing anyway`);
    }
  } catch (e: any) {
    console.warn(
      `Proof server health check failed (${e.message ?? e}).\n` +
        `  If it's running in Docker, this may be a WSL2 networking issue — continuing.`,
    );
  }

  try {
    // Build wallet using FluentWalletBuilder (official pattern)
    console.log('Building wallet...');
    const dustOptions = {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: config.networkId === 'undeployed' ? 500_000_000_000_000_000n : 1_000n,
      feeBlocksMargin: 5,
    };

    const builder = FluentWalletBuilder.forEnvironment(config.env)
      .withSeed(seed)
      .withDustOptions(dustOptions);

    const buildResult = await builder.buildWithoutStarting();
    const { wallet, seeds, keystore } = buildResult as {
      wallet: WalletFacade;
      seeds: { masterSeed: string; shielded: Uint8Array; dust: Uint8Array };
      keystore: { getPublicKey(): unknown; signData(payload: Uint8Array): string };
    };

    // Derive keys
    const zswapKeys = ZswapSecretKeys.fromSeed(seeds.shielded);
    const dustKey = DustSecretKey.fromSeed(seeds.dust);

    console.log(`Wallet seed: ${seeds.masterSeed}`);

    // Start wallet (syncs with chain)
    console.log('Starting wallet sync...');
    await wallet.start(zswapKeys, dustKey);
    console.log('Wallet synced');

    // Print wallet address for funding
    const unshieldedAddress = await wallet.unshielded.getAddress();
    const networkId = config.env.walletNetworkId;
    const addressString = UnshieldedAddress.codec.encode(networkId, unshieldedAddress).asString();
    console.log('');
    console.log(`  Your wallet address (unshielded): ${addressString}`);
    console.log(`  Faucet: ${config.env.faucet ?? 'N/A (local devnet)'}`);
    console.log('');
    console.log('  >>> Fund this wallet with tNIGHT from the faucet, then re-run deploy. <<<');
    console.log('');

    // Create wallet provider
    const walletProvider = new MidnightWalletProvider(wallet, zswapKeys, dustKey, keystore);

    // Build providers
    const zkConfigProvider = new NodeZkConfigProvider(contractPath);

    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: `dark-pool-ps-${config.networkId}`,
        signingKeyStoreName: `dark-pool-sk-${config.networkId}`,
        privateStoragePasswordProvider: () =>
          process.env.PRIVATE_STATE_PASSWORD || 'DarkPool-Dev-2026-!Secure',
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(config.env.indexer, config.env.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(config.env.proofServer, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    };

    // Build compiled contract
    const compiled = CompiledContract.withCompiledFileAssets(
      CompiledContract.withWitnesses(CompiledContract.make('DarkPool', Contract), {}),
      contractPath,
    );

    console.log('Deploying contract...');

    // Contract constructor requires sequencerAddr (Field = bigint)
    // Using the deployer's coin public key as the sequencer address
    const coinPubKeyHex = walletProvider.getCoinPublicKey();
    const coinPubKeyBytes = encodeCoinPublicKey(coinPubKeyHex);
    const sequencerAddr = coinPubKeyBytes.reduce(
      (acc, byte) => (acc << 8n) + BigInt(byte),
      0n,
    );
    console.log(`Sequencer address (deployer): ${coinPubKeyHex}`);

    const deployed = await deployContract(providers, {
      compiledContract: compiled,
      privateStateId: 'darkPoolPrivateState',
      initialPrivateState: {},
      signingKey: sampleSigningKey(),
      args: [sequencerAddr],
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;

    console.log('');
    console.log('  Contract deployed successfully!');
    console.log(`  Address: ${contractAddress}`);
    console.log('');

    // Save deployment info
    const deploymentInfo = {
      contractAddress,
      network: config.networkId,
      label: config.label,
      deployedAt: new Date().toISOString(),
      endpoints: {
        indexer: config.env.indexer,
        nodeRpc: config.env.node,
      },
    };

    const deploymentPath = path.join(__dirname, '../deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment info saved to: ${deploymentPath}`);

    // Cleanup
    await wallet.stop();
    console.log('Done.');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

deploy();
