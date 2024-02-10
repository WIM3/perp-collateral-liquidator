import { Mutex } from "async-mutex"
import { ContractTransaction, providers } from "ethers"
import _ from "lodash"
import fetch from "node-fetch"
import {
    AccountBalance,
    AccountBalance__factory,
    ClearingHouse,
    ClearingHouse__factory,
} from "../../typechain/perp-curie"
import { sleep } from "./utils"

interface GraphData {
    id: string
}

export type Config = {
    subgraphEndPt: string
    provider: providers.StaticJsonRpcProvider
    clearingHouseAddr: string
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
    clearingHouse: ClearingHouse
    mutex: Mutex
    accountBalance: AccountBalance
    provider: providers.StaticJsonRpcProvider
    liquidatedAccountsCounter: number = 0

    async setup(config: Config): Promise<void> {
        console.log({
            event: "SetupLiquidator",
            params: { config },
        })
        this.config = config
        this.subgraphEndpoint = this.config.subgraphEndPt

        this.mutex = new Mutex()
        this.clearingHouse = ClearingHouse__factory.connect(this.config.clearingHouseAddr, this.config.provider)
        this.accountBalance = AccountBalance__factory.connect(
            await this.clearingHouse.getAccountBalance(),
            this.config.provider,
        )
    }

    async start(): Promise<Number> {
        let makers: string[]
        let traders: string[]
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
                chunkedAccounts.map(account => {
                    console.log({ event: "TryLiquidateAccountCollateral", params: account })
                    return this.liquidate(account)
                }),
            )
        }
        return this.liquidatedAccountsCounter
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

    async liquidateCollateral(account: string): Promise<void> {
        const baseTokens = await this.accountBalance.getBaseTokens(account)
        baseTokens.forEach(async baseToken => {
            try {
                const tx = await this.clearingHouse["liquidate(address,address)"](account, baseToken)
                console.log({
                    event: `Send TxSucceeded`,
                    params: {
                        account,
                        baseToken: baseToken,
                        txHash: tx.hash,
                    },
                })

                await this.txCheck(tx)
            } catch (e) {
                const error = new CustomError(`Send TxFailed`, {
                    params: {
                        account,
                        baseToken: baseToken,
                        reason: e.toString(),
                    },
                })
                throw error
            }
        })
    }

    async txCheck(tx: ContractTransaction): Promise<void> {
        try {
            await tx.wait()
            console.log({
                event: `TX Succeeded`,
                params: {
                    txHash: tx.hash,
                },
            })
        } catch (e) {
            console.error({
                event: `TX Failed`,
                params: {
                    txHash: tx.hash,
                    reason: e.toString(),
                },
            })
        }
    }

    async isLiquidatable(account: string): Promise<boolean> {
        const mrfl = await this.accountBalance.getMarginRequirementForLiquidation(account)
        const accValue = await this.clearingHouse.getAccountValue(account)
        return accValue < mrfl
    }

    async liquidate(account: string): Promise<void> {
        if (!(await this.isLiquidatable(account))) {
            return
        }

        try {
            this.liquidatedAccountsCounter+=1
            await this.liquidateCollateral(account)
        } catch (e) {
            console.error({ event: e.name, params: e.params || {} })
        }
    }
}
