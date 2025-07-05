import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';

import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.26',
        path: path.resolve(__dirname, 'node_modules/solc/soljson.js'),
      },
    ],
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v6',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  gasReporter: {
    enabled: true,
    outputFile: 'gas-report.txt',
    noColors: true,
  },
  networks: {
    // Example settings reading RPC URLs and keys from `.env`
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '',
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [process.env.SEPOLIA_PRIVATE_KEY]
        : [],
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || '',
      accounts: process.env.MAINNET_PRIVATE_KEY
        ? [process.env.MAINNET_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
