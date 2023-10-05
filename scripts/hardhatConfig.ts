import {
    OPTIMISM_DEPLOYER_MNEMONIC,
    OPTIMISM_GOERLI_DEPLOYER_MNEMONIC,
    OPTIMISM_GOERLI_WEB3_ENDPOINT,
    OPTIMISM_WEB3_ENDPOINT,
} from "../constants"

export function getUrl(network: string) {
    const NetworkUrl = {
        optimism: OPTIMISM_WEB3_ENDPOINT,
        optimismGoerli: OPTIMISM_GOERLI_WEB3_ENDPOINT,
    }

    return NetworkUrl[network] ? NetworkUrl[network] : ""
}

export function getMnemonic(network: string) {
    const NetworkMnemonic = {
        optimism: OPTIMISM_DEPLOYER_MNEMONIC,
        optimismGoerli: OPTIMISM_GOERLI_DEPLOYER_MNEMONIC,
    }

    return NetworkMnemonic[network] ? NetworkMnemonic[network] : ""
}


