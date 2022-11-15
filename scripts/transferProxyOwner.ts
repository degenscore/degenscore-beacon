import { upgrades } from "hardhat";
import { getConfig } from "../helper/config";

async function main() {
    const config = getConfig();

    await upgrades.admin.transferProxyAdminOwnership(config.owner);

    console.log(`Transferred proxy ownership to ${config.owner}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
