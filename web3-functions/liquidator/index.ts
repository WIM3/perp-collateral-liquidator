/* eslint-disable @typescript-eslint/naming-convention */
import { Web3Function, Web3FunctionContext } from "@gelatonetwork/web3-functions-sdk"
import { Liquidator } from "./liquidator"

Web3Function.onRun(async (context: Web3FunctionContext) => {
    const { multiChainProvider } = context
    const provider = multiChainProvider.default()

    const liquidator = new Liquidator()
    const subgraphEndPt = await context.secrets.get("SUBGRAPH_ENDPT")
    const clearingHouseAddr = await context.secrets.get("CLEARING_HOUSE_CONTRACT")

    await liquidator.setup({
        subgraphEndPt: subgraphEndPt,
        provider: provider,
        clearingHouseAddr: clearingHouseAddr,
    })
    const accCount = await liquidator.start()

    return {
        canExec: false,
        message: `liquidated ${accCount} accounts`,
    }
})
