import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { setBalance } from "@nomicfoundation/hardhat-network-helpers";

import { DegenScoreBeacon, DegenScoreBeacon__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { UserPayloadStruct } from "../typechain-types/contracts/DegenScoreBeacon";

describe("Submit Test", () => {
    let signers: SignerWithAddress[];
    let user: SignerWithAddress;
    let signer: SignerWithAddress;
    let feeCollector: SignerWithAddress;
    let owner: SignerWithAddress;
    let signatureTTL: number;

    const primaryTraitURI = "https://degenscore.test/primary/{id}.json";
    const beaconURI = "https://degenscore.test/beacon/{id}.json";

    let beacon: DegenScoreBeacon;

    const dsId = ethers.BigNumber.from(Buffer.from("degen_score"));
    const trait2Id = ethers.BigNumber.from(Buffer.from("primary_trait2"));
    const trait3Id = ethers.BigNumber.from(Buffer.from("primary_trait3"));
    const trait4Id = ethers.BigNumber.from(Buffer.from("primary_trait4"));

    async function userDataFixture(userAccount: string, override?: Partial<UserPayloadStruct>) {
        const t = await time.latest();
        const data: UserPayloadStruct = {
            account: userAccount,
            createdAt: t,
            price: ethers.utils.parseEther("0"),
            beaconId: "5",
            traits: [
                { id: dsId, value: 3000 },
                { id: trait2Id, value: 2000 },
                { id: trait3Id, value: 1000 },
                { id: trait4Id, value: 1 },
            ],
            ...(override ? override : {}),
        };

        const f = DegenScoreBeacon__factory.createInterface();
        const func = f.getFunction("submitTraits");
        const encoded = f._encodeParams([func.inputs[0]], [data]);
        const hashed = ethers.utils.keccak256(encoded);

        const signature = await signer.signMessage(ethers.utils.arrayify(hashed));

        return { data, signature };
    }

    beforeEach(async () => {
        signers = await ethers.getSigners();
        user = signers[0];
        signer = signers[1];
        feeCollector = signers[2];
        owner = signers[3];
        signatureTTL = 900; // 15 min

        const DegenscoreBeacon = await ethers.getContractFactory("DegenScoreBeacon");
        beacon = (await upgrades.deployProxy(DegenscoreBeacon, [
            owner.address,
            signer.address,
            feeCollector.address,
            signatureTTL,
            primaryTraitURI,
            beaconURI,
        ])) as DegenScoreBeacon;
        await beacon.deployed();
    });

    it("can submit", async () => {
        const traits = [{ id: dsId, value: 3000 }];

        const { data, signature } = await userDataFixture(user.address, {
            traits,
        });

        await beacon.submitTraits(data, signature);

        const { data: data2, signature: sig2 } = await userDataFixture(user.address, {
            traits,
        });

        await beacon.submitTraits(data2, sig2);
    });
});
