import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { setBalance } from "@nomicfoundation/hardhat-network-helpers";

import { DegenScoreBeacon, DegenScoreBeacon__factory } from "../typechain-types";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { UserPayloadStruct } from "../typechain-types/contracts/DegenScoreBeacon";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("DegenScoreBeacon", () => {
    let signers: SignerWithAddress[];
    let user: SignerWithAddress;
    let signer: SignerWithAddress;
    let feeCollector: SignerWithAddress;
    let owner: SignerWithAddress;
    let signatureTTL: number;

    const traitURI = "https://degenscore.com/beacon/primary/";
    const beaconURI = "https://degenscore.com/beacon/secondary/";

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
            traitURI,
            beaconURI,
        ])) as DegenScoreBeacon;
        await beacon.deployed();
    });

    describe("Traits", () => {
        it("returns a 0 trait if no trait has been submitted on that address", async () => {
            const value = await beacon.balanceOf(user.address, dsId);

            expect(value.toNumber()).eq(0);
        });

        it("can receive and return valid trait data", async () => {
            const trait = { id: dsId, value: 2000 };
            const { data, signature } = await userDataFixture(user.address, {
                traits: [trait],
            });

            await expect(beacon.submitTraits(data, signature))
                .emit(beacon, "TransferSingle")
                .withArgs(beacon.address, ZERO_ADDRESS, user.address, data.beaconId, 1);

            expect(await beacon.balanceOf(user.address, trait.id)).equal(trait.value);
        });

        it("emits the SubmitTraits event", async () => {
            const trait = { id: dsId, value: 2000 };
            const { data, signature } = await userDataFixture(user.address, {
                traits: [trait],
            });

            await expect(beacon.submitTraits(data, signature))
                .emit(beacon, "SubmitTraits")
                .withArgs(data.beaconId, data.createdAt);
        });

        it("emits the TransferSingle event", async () => {
            const trait = { id: dsId, value: 2000 };
            const { data, signature } = await userDataFixture(user.address, {
                traits: [trait],
            });

            await expect(beacon.submitTraits(data, signature))
                .emit(beacon, "TransferSingle")
                .withArgs(beacon.address, ZERO_ADDRESS, user.address, trait.id, trait.value);

            const res = beacon.balanceOf(user.address, trait.id);

            expect(await res).equal(trait.value);
        });

        it("emits the diff TransferSingle event when the trait changes", async () => {
            const trait = { id: dsId, value: 2000 };
            const { data, signature } = await userDataFixture(user.address, {
                traits: [trait],
            });

            await expect(beacon.submitTraits(data, signature))
                .emit(beacon, "TransferSingle")
                .withArgs(beacon.address, ZERO_ADDRESS, user.address, trait.id, trait.value);

            const trait2 = { id: dsId, value: 1000 };
            const { data: data2, signature: sig2 } = await userDataFixture(user.address, {
                traits: [trait2],
            });

            await expect(beacon.submitTraits(data2, sig2))
                .emit(beacon, "TransferSingle")
                .withArgs(beacon.address, user.address, ZERO_ADDRESS, trait2.id, trait.value - trait2.value);
        });

        it("does not emit the TransferSingle event when the trait does not change", async () => {
            const trait = { id: dsId, value: 2000 };
            const { data, signature } = await userDataFixture(user.address, {
                traits: [trait],
            });

            await expect(beacon.submitTraits(data, signature))
                .emit(beacon, "TransferSingle")
                .withArgs(beacon.address, ZERO_ADDRESS, user.address, trait.id, trait.value);

            const { data: data2, signature: sig2 } = await userDataFixture(user.address, {
                traits: [trait],
            });

            await expect(beacon.submitTraits(data2, sig2)).not.emit(beacon, "TransferSingle");
        });

        it("it rejects getting traits of 0 address", async () => {
            await expect(beacon.balanceOf(ZERO_ADDRESS, dsId)).revertedWith(
                "ERC1155: address zero is not a valid owner"
            );
        });

        it("can return batch traits", async () => {
            const { data, signature } = await userDataFixture(user.address);

            await beacon.submitTraits(data, signature);

            const [ds, trait2, trait3] = await beacon.getTraitBatch(
                [user.address, user.address, user.address],
                [dsId, trait2Id, trait3Id],
                [0, 0, 0]
            );

            expect(ds).not.equals(ethers.BigNumber.from(0));
            expect(trait2).not.equals(ethers.BigNumber.from(0));
            expect(trait3).not.equals(ethers.BigNumber.from(0));
        });

        it("can return batch traits using ERC1155", async () => {
            const { data, signature } = await userDataFixture(user.address);

            await beacon.submitTraits(data, signature);

            const [ds, trait2, trait3] = await beacon.balanceOfBatch(
                [user.address, user.address, user.address],
                [dsId, trait2Id, trait3Id]
            );

            expect(ds).not.equals(ethers.BigNumber.from(0));
            expect(trait2).not.equals(ethers.BigNumber.from(0));
            expect(trait3).not.equals(ethers.BigNumber.from(0));
        });

        it("does not return a lost trait", async () => {
            const { data, signature } = await userDataFixture(user.address);

            await beacon.submitTraits(data, signature);
            expect(await beacon.getTrait(user.address, data.traits[2].id, 0)).equals(data.traits[2].value);

            const { data: data2, signature: signature2 } = await userDataFixture(user.address, {
                createdAt: (data.createdAt as number) + 1,
                traits: [data.traits[0], data.traits[1]],
            });

            await beacon.submitTraits(data2, signature2);
            expect(await beacon.getTrait(user.address, data.traits[2].id, 0)).equals(ethers.BigNumber.from(0));
        });

        it("returns a trait if maxAge == 0", async () => {
            const { data, signature } = await userDataFixture(user.address);

            await beacon.submitTraits(data, signature);

            expect(await beacon.getTrait(user.address, data.traits[0].id, 0)).equals(data.traits[0].value);
        });

        it("can return a trait within maxAge", async () => {
            const t = await time.latest();

            //wait time.increaseTo(t + 1000);
            const { data, signature } = await userDataFixture(user.address, { createdAt: t });

            await beacon.submitTraits(data, signature);

            await time.increaseTo(t + 2000);

            expect(await beacon.getTrait(user.address, data.traits[0].id, 2001)).equals(data.traits[0].value);
        });

        it("can exclude a trait by maxAge", async () => {
            const t = await time.latest();

            //wait time.increaseTo(t + 1000);
            const { data, signature } = await userDataFixture(user.address, { createdAt: t });

            await beacon.submitTraits(data, signature);

            await time.increaseTo(t + 2000);

            expect(await beacon.getTrait(user.address, data.traits[0].id, 10)).equals(ethers.BigNumber.from(0));
        });

        it("can burn the beacon", async () => {
            const { data, signature } = await userDataFixture(user.address);

            await beacon.submitTraits(data, signature);

            const traitIds = data.traits.map((t) => t.id);
            const traitValues = data.traits.map((t) => 0);

            await expect(beacon.burn())
                .emit(beacon, "Burn")
                .withArgs(data.beaconId)
                .and.emit(beacon, "TransferSingle")
                .withArgs(beacon.address, user.address, ZERO_ADDRESS, data.beaconId, 0)
                .and.emit(beacon, "TransferBatch")
                .withArgs(beacon.address, user.address, ZERO_ADDRESS, traitIds, traitValues);

            expect(await beacon.getTrait(user.address, data.traits[0].id, 0)).equals(ethers.BigNumber.from(0));

            const beaconData = await beacon.beaconDataOf(user.address);
            expect(beaconData.beaconId).equals(ethers.BigNumber.from(0));
            expect(beaconData.updatedAt).equals(ethers.BigNumber.from(0));
        });

        it("can return all traits of a user", async () => {
            const { data, signature } = await userDataFixture(user.address);

            await beacon.submitTraits(data, signature);

            const traits = await beacon.getAllTraitsOf(data.account);

            expect(traits.traitIds.length).equals(data.traits.length);
            expect(traits.traitValues.length).equals(data.traits.length);
            expect(traits.updatedAt).equals(data.createdAt);

            data.traits.forEach((t, i) => {
                expect(t.id).equals(traits.traitIds[i]);
                expect(t.value).equals(traits.traitValues[i]);
            });
        });
    });

    describe("UserData", () => {
        it("returns the owner address", async () => {
            const { data, signature } = await userDataFixture(user.address);
            await beacon.submitTraits(data, signature);

            expect(await beacon.ownerOfBeacon(data.beaconId)).equals(user.address);
        });

        it("returns balance 1 if user has beacon (ERC1155)", async () => {
            const { data, signature } = await userDataFixture(user.address);
            await beacon.submitTraits(data, signature);

            expect(await beacon.balanceOf(user.address, data.beaconId)).equals(ethers.BigNumber.from(1));
        });

        it("returns balance 0 if does not have a beacon (ERC1155)", async () => {
            expect(await beacon.balanceOf(user.address, 0)).equals(ethers.BigNumber.from(0));
        });

        it("can get the trait uri", async () => {
            const { data, signature } = await userDataFixture(user.address);
            await beacon.submitTraits(data, signature);

            expect(await beacon.uri(data.traits[0].id)).equals(traitURI + data.traits[0].id + ".json");
        });

        it("can get the beacon uri", async () => {
            const { data, signature } = await userDataFixture(user.address);
            await beacon.submitTraits(data, signature);

            expect(await beacon.uri(data.beaconId)).equals(beaconURI + user.address.toLowerCase() + ".json");
        });

        it("reverts if no beacon if found for URI", async () => {
            const { data, signature } = await userDataFixture(user.address);
            await beacon.submitTraits(data, signature);

            await expect(beacon.getBeaconURI("0")).revertedWith("No Beacon found");
        });
    });

    describe("Validation", () => {
        it("cannot call the initializer twice", async () => {
            await expect(
                beacon.initialize(
                    owner.address,
                    signer.address,
                    feeCollector.address,
                    signatureTTL,
                    traitURI,
                    beaconURI
                )
            ).revertedWith("Initializable: contract is already initialized");
        });

        it("rejects accounts and ids length mismatch on batch", async () => {
            await expect(beacon.balanceOfBatch([user.address], [dsId, trait2Id, trait3Id])).revertedWith(
                "accounts and ids length mismatch"
            );
        });

        it("rejects accounts and traitIds length mismatch on batch", async () => {
            await expect(beacon.getTraitBatch([user.address], [dsId, trait2Id, trait3Id], [0, 0, 0])).revertedWith(
                "accounts and traitIds length mismatch"
            );
        });

        it("rejects accounts and maxAges length mismatch on batch", async () => {
            await expect(beacon.getTraitBatch([user.address, user.address], [dsId, trait2Id], [0])).revertedWith(
                "accounts and maxAges length mismatch"
            );
        });

        it("rejects an invalid signature", async () => {
            const { data } = await userDataFixture(user.address);
            const { signature: invalidSignature } = await userDataFixture(user.address, { createdAt: 0 });

            await expect(beacon.submitTraits(data, invalidSignature)).revertedWith("Invalid signature");
        });

        it("rejects expired signature", async () => {
            const { data, signature } = await userDataFixture(user.address, {
                createdAt: 0,
            });

            await expect(beacon.submitTraits(data, signature)).revertedWith("Signature expired");
        });

        it("rejects a already used signature", async () => {
            const { data, signature } = await userDataFixture(user.address);

            await beacon.submitTraits(data, signature);

            await expect(beacon.submitTraits(data, signature)).revertedWith("Invalid data");
        });

        it("can update the signer address", async () => {
            const newSigner = signers[5].address;
            await beacon.connect(owner).setSigner(signers[5].address);

            expect(await beacon.getSigner()).equal(newSigner);
        });

        it("rejects 0 address fee-collector", async () => {
            await expect(beacon.connect(owner).setSigner(ZERO_ADDRESS)).revertedWith("New signer is the zero address");
        });

        it("rejects 0 address beaconDataOf", async () => {
            await expect(beacon.beaconDataOf(ZERO_ADDRESS)).revertedWith("address zero is not a valid owner");
        });

        it("rejects 0 address balanceOf", async () => {
            await expect(beacon.balanceOf(ZERO_ADDRESS, 0)).revertedWith("ERC1155: address zero is not a valid owner");
        });

        it("rejects 0 address getAllTraitsOf", async () => {
            await expect(beacon.getAllTraitsOf(ZERO_ADDRESS)).revertedWith("address zero is not a valid owner");
        });

        it("rejects burning when the user does not have a Beacon", async () => {
            await expect(beacon.burn()).revertedWith("Address does not own a Beacon");
        });
    });

    describe("Payment", () => {
        it("rejects when payment is not equal to send ETH", async () => {
            const { data, signature } = await userDataFixture(user.address, {
                price: ethers.utils.parseEther("2"),
            });
            const invalidAmount = ethers.utils.parseEther("1");

            await expect(beacon.submitTraits(data, signature, { value: invalidAmount })).revertedWith(
                "Wrong value sent"
            );
        });

        it("it transfers payment to the feeCollector", async () => {
            await setBalance(feeCollector.address, 0);
            const { data, signature } = await userDataFixture(user.address, {
                price: ethers.utils.parseEther("2"),
            });

            await beacon.submitTraits(data, signature, { value: data.price });

            expect(await feeCollector.getBalance()).equal(data.price);
        });

        it("can update the fee-collector address", async () => {
            const newFeeCollector = signers[5].address;
            await beacon.connect(owner).setFeeCollector(signers[5].address);

            expect(await beacon.getFeeCollector()).equal(newFeeCollector);
        });

        it("rejects 0 address fee-collector", async () => {
            await expect(beacon.connect(owner).setFeeCollector(ZERO_ADDRESS)).revertedWith(
                "New feeCollector is the zero address"
            );
        });
    });

    describe("Ownable", () => {
        it("rejects setSigner by not owners", async () => {
            await expect(beacon.setSigner(signers[5].address)).revertedWith("Ownable: caller is not the owner");
        });

        it("rejects setFeeCollector by not owners", async () => {
            await expect(beacon.setFeeCollector(signers[5].address)).revertedWith("Ownable: caller is not the owner");
        });

        it("rejects pause by not owners", async () => {
            await expect(beacon.pause()).revertedWith("Ownable: caller is not the owner");
        });

        it("rejects unpause by not owners", async () => {
            await expect(beacon.unpause()).revertedWith("Ownable: caller is not the owner");
        });

        it("rejects setSignatureTTL by not owners", async () => {
            await expect(beacon.setSignatureTTL(1)).revertedWith("Ownable: caller is not the owner");
        });

        it("rejects setPrimaryTraitURI by not owners", async () => {
            await expect(beacon.setPrimaryTraitURI("")).revertedWith("Ownable: caller is not the owner");
        });

        it("rejects setBeaconURI by not owners", async () => {
            await expect(beacon.setBeaconURI("")).revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Pausable", () => {
        it("can pause the contract", async () => {
            await beacon.connect(owner).pause();

            expect(await beacon.paused()).equal(true);
        });

        it("can unpause the contract", async () => {
            await beacon.connect(owner).pause();
            await beacon.connect(owner).unpause();

            expect(await beacon.paused()).equal(false);
        });
    });

    describe("Paused contract", () => {
        const PAUSED_MSG = "Pausable: paused";
        beforeEach(async () => {
            await beacon.connect(owner).pause();
        });

        it("rejects submitting traits when paused", async () => {
            const { data, signature } = await userDataFixture(user.address);
            await expect(beacon.submitTraits(data, signature)).revertedWith(PAUSED_MSG);
        });

        it("rejects balanceOf when paused", async () => {
            await expect(beacon.balanceOf(user.address, dsId)).revertedWith(PAUSED_MSG);
        });

        it("rejects balanceOfBatch when paused", async () => {
            await expect(beacon.balanceOfBatch([user.address], [dsId])).revertedWith(PAUSED_MSG);
        });
    });

    describe("Management", () => {
        it("can set the signature TTL", async () => {
            const ttl = ethers.BigNumber.from(10);
            await beacon.connect(owner).setSignatureTTL(ttl);
            expect(await beacon.getSignatureTTL()).equals(ttl);
        });

        it("can set the primary Trait URI", async () => {
            const uri = "https://example.com";
            await beacon.connect(owner).setPrimaryTraitURI(uri);
        });

        it("can set the Beacon URI", async () => {
            const uri = "https://example.com";
            await beacon.connect(owner).setBeaconURI(uri);
        });
    });
});
