import fs from "fs"
import { glob, runTypeChain } from "typechain"

async function main() {
    const cwd = process.cwd()

    let allFiles = glob(cwd, [
        `${__dirname}/../node_modules/@perp/curie-deployments/optimism/core/artifacts/contracts/**/*.json`,
    ])
    await runTypeChain({
        cwd,
        filesToProcess: allFiles,
        allFiles,
        outDir: "typechain/perp-curie",
        target: "ethers-v5",
    })
    
    console.log(`type generated`)
}

main().catch(console.error)
