require("dotenv").config({ path: `.env` })

import _ from "lodash"

export const OPTIMISM_GOERLI_WEB3_ENDPOINT = _.defaultTo(process.env["OPTIMISM_GOERLI_URL"], "")
export const OPTIMISM_GOERLI_DEPLOYER_MNEMONIC = _.defaultTo(process.env["MNEMONIC"], "")
export const OPTIMISM_WEB3_ENDPOINT = _.defaultTo(process.env["OPTIMISM_GOERLI_URL"], "")
export const OPTIMISM_DEPLOYER_MNEMONIC = _.defaultTo(process.env["MNEMONIC"], "")

if (_.isEmpty(OPTIMISM_GOERLI_DEPLOYER_MNEMONIC)) {
    console.warn("OPTIMISM_GOERLI_DEPLOYER_MNEMONIC is empty")
}
if (_.isEmpty(OPTIMISM_GOERLI_WEB3_ENDPOINT)) {
    console.warn("OPTIMISM_GOERLI_WEB3_ENDPOINT is empty")
}
if (_.isEmpty(OPTIMISM_DEPLOYER_MNEMONIC)) {
    console.warn("OPTIMISM_DEPLOYER_MNEMONIC is empty")
}
if (_.isEmpty(OPTIMISM_WEB3_ENDPOINT)) {
    console.warn("OPTIMISM_WEB3_ENDPOINT is empty")
}

export enum ChainId {
    OPTIMISM_CHAIN_ID = 10,
    OPTIMISM_GOERLI_CHAIN_ID = 420,
}

export enum CompanionNetwork {
    optimism = "optimism",
    optimismGoerli = "optimismGoerli",
}
