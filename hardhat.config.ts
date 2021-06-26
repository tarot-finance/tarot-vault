import * as dotenv from "dotenv";
dotenv.config();
import {
  HardhatUserConfig,
  HttpNetworkConfig,
  HttpNetworkHDAccountsConfig,
} from "hardhat/types";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-truffle5";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    overrides: {
      "contracts/spirit/SpiritMasterChef.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/spirit/SpiritFactory.sol": {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/spirit/SpiritRouter.sol": {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/spooky/MasterChef.sol": {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/spooky/UniswapV2Factory.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      "contracts/spooky/UniswapV2Router02.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    fantom: {
      chainId: 250,
      url: "https://rpcapi.fantom.network",
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
    fantomtestnet: {
      chainId: 4002,
      url: "https://rpc.testnet.fantom.network",
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
  },
  etherscan: {
    apiKey: process.env.FTMSCAN_API_KEY,
  },
};

export default config;
