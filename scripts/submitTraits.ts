import { ethers, network } from "hardhat";
import { getDeployment } from "../helper/deployments";
import { UserPayloadStruct } from "../typechain-types/contracts/DegenScoreBeacon";
import beaconData from "./beaconData.json";

async function main() {
    const address = await getDeployment("DegenScoreBeacon").catch(async (e) => {
        if (network.name === "hardhat" || network.name === "localhost") {
            return (await ethers.getSigners())[0].address;
        }
        throw e;
    });

    const DegenscoreBeacon = await ethers.getContractFactory("DegenScoreBeacon");
    const beacon = DegenscoreBeacon.attach(address);

    const data: UserPayloadStruct = {
        traits: beaconData.data.traits,
        createdAt: beaconData.data.created_at,
        account: beaconData.data.account,
        beaconId: beaconData.data.beacon_id,
        price: beaconData.data.price,
    };

    const tx = await beacon.submitTraits(data, beaconData.signature, { value: data.price });
    console.log("Submitted data. TX:", tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
