import "@nomicfoundation/hardhat-verify"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@openzeppelin/hardhat-upgrades"
import "@typechain/hardhat"
import dotenv from "dotenv"
import "hardhat-contract-sizer"
import "hardhat-deploy"
import "hardhat-gas-reporter"
import { HardhatUserConfig } from "hardhat/config"
import "solidity-coverage"
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";


dotenv.config()

const config: HardhatUserConfig = {
    w3f: {
        rootDir: "./web3-functions",
        debug: false,
        networks: [
          "opsepolia",
        ], //(multiChainProvider) injects provider for these networks
      },
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
        opsepolia: {
            url: process.env.OPTIMISM_SEPOLIA_URL,
            accounts: {
                mnemonic: process.env.MNEMONIC || `0x${process.env.PRIVATE_KEY}` || "",
            },
            gas:6000000,
            chainId: 11155420,
        }
    },
    contractSizer: {
        // max bytecode size is 24.576 KB
        alphaSort: true,
        runOnCompile: true,
        disambiguatePaths: true,
        except: ["@openzeppelin/", "@uniswap/", "@perp/perp-oracle-contract/", "@perp/voting-escrow/"],
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
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    etherscan: {
        apiKey: process.env.OPSCAN_API_KEY,
    },
}

export default config