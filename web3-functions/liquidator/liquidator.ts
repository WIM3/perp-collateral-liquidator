import { Mutex } from "async-mutex"
import { ContractTransaction, providers } from "ethers"
import _ from "lodash"
import fetch from "node-fetch"
import {
    AccountBalance,
    AccountBalance__factory,
} from "../../typechain/perp-curie"
import { sleep } from "./utils"
import {Contract} from "@ethersproject/contracts"
import {clearingHouseAbi} from "./abis/abis"

interface GraphData {
    id: string
}

export type Config = {
    subgraphEndPt: string
    provider: providers.StaticJsonRpcProvider
    clearingHouseAddr: string
}

type CallData = {
    to: string,
    data: string,
}

class CustomError extends Error {
    params: any

    constructor(message: string, { params }) {
        super(message)
        this.params = params
    }
}

// Alchemy's current rate limit is 660 CU per second, and an eth_call takes 26 CU
// so we could have around 25 eth_calls per second.
// https://docs.alchemy.com/alchemy/documentation/rate-limits
const REQUEST_CHUNK_SIZE = 25
export class Liquidator {
    config: Config
    subgraphEndpoint: string
    clearingHouse: Contract
    mutex: Mutex
    accountBalance: AccountBalance
    provider: providers.StaticJsonRpcProvider

    async setup(config: Config): Promise<void> {
        this.config = config
        this.subgraphEndpoint = this.config.subgraphEndPt

        this.mutex = new Mutex()
        this.clearingHouse = new Contract(this.config.clearingHouseAddr, clearingHouseAbi, this.config.provider)
        this.accountBalance = AccountBalance__factory.connect(
            await this.clearingHouse.getAccountBalance(),
            this.config.provider,
        )
    }

    async start(): Promise<CallData[]> {
        let makers: string[]
        let traders: string[]
        let accountsToLiquidate: CallData[] = []
        while (true) {
            try {
                const results = await Promise.all([this.fetchAccounts("makers"), this.fetchAccounts("traders")])
                makers = results[0]
                traders = results[1]
                break
            } catch (err: any) {
                console.error({
                    event: "FetchMakerTraderError",
                    params: {
                        err,
                    },
                })

                // retry after 3 seconds
                await sleep(3000)
                continue
            }
        }

        const accounts = _.uniq([...makers, ...traders])

        for (const chunkedAccounts of _.chunk(accounts, REQUEST_CHUNK_SIZE)) {
            await Promise.all(
                chunkedAccounts.map(async (account) => {
                    let data = await this.liquidate(account)
                    if(data !== ""){
                        accountsToLiquidate.push({
                            to: this.config.clearingHouseAddr,
                            data: data
                        })
                    }
                }),
            )
        }
        return accountsToLiquidate
    }

    async fetchAccounts(type: "traders" | "makers"): Promise<string[]> {
        const createQueryFunc = (batchSize: number, lastID: string) => `
        {
            ${type}(first: ${batchSize}, where: {id_gt: "${lastID}"}) {
                id
            }
        }`
        const extractDataFunc = (data: any): GraphData => {
            return data.data[type]
        }
        return (await this.queryAndExtractSubgraphAll(createQueryFunc, extractDataFunc)).map(
            accountData => accountData.id,
        )
    }

    async queryAndExtractSubgraphAll(
        createQueryFunc: (batchSize: number, lastID: string) => string,
        extractDataFunc: (data: any) => any,
    ): Promise<GraphData[]> {
        let results: GraphData[] = []
        // batchSize should between 0 ~ 1000
        const batchSize = 1000
        let lastID = ""
        while (true) {
            const query = createQueryFunc(batchSize, lastID)
            const data = await this.querySubgraph(query)
            if (data.errors) {
                break
            }
            const batch = extractDataFunc(data)
            if (batch.length === 0) {
                break
            }
            results = [...results, ...batch]
            lastID = results[results.length - 1].id
        }
        return results
    }

    async querySubgraph(query: string): Promise<any> {
        const resp = await fetch(this.subgraphEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query }),
        })
        const data = await resp.json()
        if (data.errors) {
            console.error({
                event: "GraphQueryError",
                params: {
                    err: new Error("GraphQueryError"),
                    errors: data.errors,
                },
            })
        }
        return data
    }

    async liquidateCollateral(account: string): Promise<string> {
        const baseTokens = await this.accountBalance.getBaseTokens(account)
        // for the Demo the only baseToken will be vETH
        return this.clearingHouse.interface.encodeFunctionData("liquidate", [account, baseTokens[0]])
    }

    async isLiquidatable(account: string): Promise<boolean> {
        const mrfl = await this.accountBalance.getMarginRequirementForLiquidation(account)
        const accValue = await this.clearingHouse.getAccountValue(account)
        return accValue < mrfl
    }

    async liquidate(account: string): Promise<string> {
        if (!(await this.isLiquidatable(account))) {
            return ""
        }

        try {
            let data = await this.liquidateCollateral(account)
            return data
        } catch (e) {
            console.error({ event: e.name, params: e.params || {} })
        }
    }
}
