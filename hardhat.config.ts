import { HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import { SolcBuild } from "hardhat/types";

import "@nomicfoundation/hardhat-toolbox";

// Use local solc instead of downloading it
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD)
  .setAction(async ({ solcVersion }: { solcVersion: string; quiet: boolean }): Promise<SolcBuild> => {
    const solcPath = require.resolve("solc/soljson.js");
    return {
      compilerPath: solcPath,
      isSolcJs: true,
      version: solcVersion,
      longVersion: solcVersion,
    };
  });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
  },
};

export default config;
