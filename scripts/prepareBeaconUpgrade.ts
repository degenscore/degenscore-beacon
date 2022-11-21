import { ethers, network, run, upgrades } from "hardhat";
import { getDeployment } from "../helper/deployments";

async function main() {
    const address = await getDeployment("DegenScoreBeacon");
    const DegenscoreBeacon = await ethers.getContractFactory("DegenScoreBeacon");

    const upgradeAddress = await upgrades.prepareUpgrade(address, DegenscoreBeacon);

    console.log("Upgraded to:", upgradeAddress);

    if (network.name === "mainnet" || network.name === "goerli") {
        console.log("Waiting for contract propagation")
        await new Promise((r) => setTimeout(r, 5000)); // sleep to wait for propagation on etherscan
        await run("verify", { address: upgradeAddress });
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
