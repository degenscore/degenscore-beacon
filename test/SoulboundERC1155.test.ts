import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { DegenScoreBeacon } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("SoulboundERC1155", () => {
    let signers: SignerWithAddress[];
    let user: SignerWithAddress;
    let signer: SignerWithAddress;
    let feeCollector: SignerWithAddress;
    let owner: SignerWithAddress;
    let signatureTTL: number;

    const primaryURI = "https://degenscore.com/beacon/primary/{id}.json";
    const secondaryURI = "https://degenscore.com/beacon/secondary/{id}.json";

    let beacon: DegenScoreBeacon;

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
            primaryURI,
            secondaryURI,
        ])) as DegenScoreBeacon;
        await beacon.deployed();
    });

    const assertSoulBound = (fn: unknown) => expect(fn).revertedWithCustomError(beacon, "SoulBoundContract");

    describe("Soul bound", () => {
        it("reverts setApprovalForAll", async () => {
            await assertSoulBound(beacon.setApprovalForAll(owner.address, true));
        });

        it("reverts isApprovedForAll", async () => {
            expect(await beacon.isApprovedForAll(owner.address, owner.address)).equals(false);
        });

        it("reverts safeTransferFrom", async () => {
            await assertSoulBound(beacon.safeTransferFrom(owner.address, owner.address, 0, 0, "0x00"));
        });

        it("reverts safeTransferFrom", async () => {
            await assertSoulBound(beacon.safeBatchTransferFrom(owner.address, owner.address, [0], [0], "0x00"));
        });
    });

    describe("Interfaces", () => {
        it("supports IERC1155 interface", async () => {
            expect(await beacon.supportsInterface("0xd9b67a26")).equals(true);
        });

        it("supports IERC1155MetadataURI interface", async () => {
            expect(await beacon.supportsInterface("0x0e89341c")).equals(true);
        });
    });
});
