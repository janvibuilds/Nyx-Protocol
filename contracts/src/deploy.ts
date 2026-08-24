/**
 * Deployment script for Dark Pool contract
 * Deploys to Midnight local devnet using genesis wallet
 */

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { WebSocket } from 'ws';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { sampleSigningKey } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { WalletFacade, createWallet } from '@midnight-ntwrk/wallet-sdk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Polyfill WebSocket for Node.js
globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

// Set network ID for local devnet
setNetworkId('undeployed');

// Import the compiled contract
import { Contract } from '../obj/dark_pool/contract/index.js';

// Network configuration
const STANDALONE_CONFIG = {
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  proofServer: 'http://127.0.0.1:6300',
  nodeRpc: 'ws://127.0.0.1:9944',
};

// Genesis seed for local devnet (pre-funded wallet)
const GENESIS_SEED = '0'.repeat(63) + '1';

async function deploy() {
  const config = STANDALONE_CONFIG;
  
  console.log('Deploying to local devnet...');
  console.log(`Indexer: ${config.indexer}`);
  console.log(`Proof Server: ${config.proofServer}`);

  // Load compiled contract path
  const contractPath = path.join(__dirname, '../obj/dark_pool');
  
  if (!fs.existsSync(contractPath)) {
    console.error('Contract not compiled. Run: compact compile dark_pool.compact obj/dark_pool');
    process.exit(1);
  }

  try {
    // Create wallet from genesis seed
    console.log('Creating wallet from genesis seed...');
    const wallet = await createWallet({
      seed: GENESIS_SEED,
      networkId: 'undeployed',
    });

    // Get wallet keys
    const shieldedSecretKeys = wallet.getShieldedSecretKeys();
    const dustSecretKey = wallet.getDustSecretKey();
    const walletAddress = wallet.getBech32Address();

    console.log(`Wallet address: ${walletAddress}`);

    // Create providers
    const privateStateProvider = levelPrivateStateProvider({
      privateStateStoreName: 'dark-pool-private-state',
      signingKeyStoreName: 'dark-pool-signing-keys',
      privateStoragePasswordProvider: () => 'DarkPool-Dev-2026-!Secure',
      accountId: walletAddress,
    });

    const publicDataProvider = indexerPublicDataProvider(
      config.indexer,
      config.indexerWS
    );

    const zkConfigProvider = new NodeZkConfigProvider(contractPath);
    const proofProvider = httpClientProofProvider(config.proofServer, zkConfigProvider);

    // Create wallet provider
    const walletProvider = {
      getCoinPublicKey: () => shieldedSecretKeys.coinPublicKey,
      getEncryptionPublicKey: () => shieldedSecretKeys.encryptionPublicKey,
      balanceTx: async (tx: any, ttl: Date = ttlOneHour()) => {
        const recipe = await wallet.balanceUnboundTransaction(
          tx,
          { shieldedSecretKeys, dustSecretKey },
          { ttl },
        );
        return await wallet.finalizeRecipe(recipe);
      },
      submitTx: async (tx: any) => {
        return await wallet.submitTransaction(tx);
      },
    };

    const providers = {
      privateStateProvider,
      publicDataProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider: walletProvider,
    };

    // Build compiled contract
    const compiled = CompiledContract.withCompiledFileAssets(
      CompiledContract.withWitnesses(
        CompiledContract.make('DarkPool', Contract),
        {} // No witnesses needed for this contract
      ),
      contractPath,
    );

    console.log('Deploying contract...');

    // Deploy contract
    const deployed = await deployContract(providers, {
      compiledContract: compiled,
      privateStateId: 'darkPoolPrivateState',
      initialPrivateState: {}, // No private state for this contract
      signingKey: sampleSigningKey(),
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;
    
    console.log('Contract deployed successfully!');
    console.log(`Contract address: ${contractAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      contractAddress,
      network: 'standalone',
      walletAddress,
      deployedAt: new Date().toISOString(),
      contractPath,
    };
    
    const deploymentPath = path.join(__dirname, '../deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment info saved to: ${deploymentPath}`);

    return deployed;
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

// Run if executed directly
deploy().catch(console.error);
