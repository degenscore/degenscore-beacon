import { ethers, network, storageLayout, upgrades, run } from "hardhat";
import { getConfig } from "../helper/config";
import { assertNotDeployed, saveDeployment } from "../helper/deployments";

async function main() {
    const config = getConfig();

    const DegenscoreBeacon = await ethers.getContractFactory("DegenScoreBeacon");

    await assertNotDeployed("DegenScoreBeacon");
    const beacon = await upgrades.deployProxy(DegenscoreBeacon, [
        config.owner,
        config.signer,
        config.feeCollector,
        config.signatureTTLSeconds,
        config.traitURI,
        config.beaconURI,
    ]);

    await beacon.deployed();
    console.log("deployed to:", beacon.address);

    if (config.saveDeployment) await saveDeployment("DegenScoreBeacon", beacon.address);

    await storageLayout.export();

    if (network.name === "mainnet" || network.name === "goerli") {
        await run("verify", { address: beacon.address });
    }

    await run("run", { script: "scripts/transferProxyOwner.ts" });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
