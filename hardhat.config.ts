import "@nomicfoundation/hardhat-verify"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-vyper"
import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"
import "hardhat-contract-sizer"
import "hardhat-deploy"
import "hardhat-deploy-ethers"
import "hardhat-gas-reporter"
import { HardhatUserConfig } from "hardhat/config"
import "solidity-coverage"
import { ChainId } from "./constants"

const config: HardhatUserConfig = {
    solidity: {
        version: "0.7.6",
        settings: {
            optimizer: { enabled: true, runs: 100 },
            evmVersion: "berlin",
            // for smock to mock contracts
            outputSelection: {
                "*": {
                    "*": ["storageLayout"],
                },
            },
        },
    },
    vyper: {
        compilers: [{ version: "0.2.16" }, { version: "0.3.1" }, { version: "0.2.7" }],
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
        opgoerli: {
            url: process.env.OPTIMISM_GOERLI_URL,
            accounts: {
                mnemonic: process.env.MNEMONIC || `0x${process.env.PRIVATE_KEY}` || "",
            },
            chainId: 420,
        },
    },
    namedAccounts: {
        deployer: 0, // 0 means ethers.getSigners[0]
        cleanAccount: 1,

        uniswapV3Router: {
            // TODO WIP
            [ChainId.OPTIMISM_CHAIN_ID]: "",
            [ChainId.OPTIMISM_GOERLI_CHAIN_ID]: "",
        },
    },
    // so we can load the contract artifacts in tests
    external: {
        contracts: [
            {
                artifacts: "node_modules/@openzeppelin/contracts/build",
            },
            {
                artifacts: "node_modules/@uniswap/v3-core/artifacts/contracts",
            },
            {
                artifacts: "node_modules/@uniswap/v3-periphery/artifacts/contracts",
            },
            {
                artifacts: "node_modules/@perp/perp-oracle-contract/artifacts/contracts",
            },
            {
                artifacts: "node_modules/@perp/curie-deployments/optimism-goerli/core/artifacts/contracts",
            },
            {
                artifacts: "test/artifacts",
            },
        ],
    },
    contractSizer: {
        alphaSort: true,
        runOnCompile: true,
        disambiguatePaths: false,
    },
    gasReporter: {
        excludeContracts: ["test"],
    },
    mocha: {
        require: ["ts-node/register/files"],
        jobs: 4,
        timeout: 120000,
        color: true,
    },
    etherscan: {
        apiKey: process.env.OPSCAN_API_KEY,
    },
}

export default config
