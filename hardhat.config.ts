import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";

import path from "path";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.26",
        path: path.resolve(__dirname, "node_modules/solc/soljson.js"),
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },
};

export default config;
