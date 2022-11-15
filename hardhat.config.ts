import { HardhatUserConfig } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-tracer";
import "hardhat-storage-layout";
import "hardhat-packager";

import * as dotenv from "dotenv";
dotenv.config();

const getGoerliAccounts = (): string[] => {
    if (!process.env.GOERLI_PK) return [];
    return [process.env.GOERLI_PK];
};

const getMainnetAccounts = (): string[] => {
    if (!process.env.MAINNET_PK) return [];
    return [process.env.MAINNET_PK];
};

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.16",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            },
        },
    },
    networks: {
        hardhat: {
            hardfork: "merge",
        },
        goerli: {
            chainId: 5,
            url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_GOERLI_KEY}`,
            accounts: getGoerliAccounts(),
        },
        mainnet: {
            chainId: 1,
            url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_KEY}`,
            accounts: getMainnetAccounts(),
            hardfork: "london",
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_KEY,
        customChains: [
            {
                network: "goerli",
                chainId: 5,
                urls: {
                    apiURL: "https://api-goerli.etherscan.io/api",
                    browserURL: "https://goerli.etherscan.io/",
                },
            },
        ],
    },
    gasReporter: {
        currency: "USD",
        enabled: process.env.REPORT_GAS ? true : false,
        coinmarketcap: process.env.COINMARKETCAP_KEY,
    },
    packager: {
        contracts: ["DegenScoreBeacon"],
        includeFactories: true,
    },
};

export default config;
