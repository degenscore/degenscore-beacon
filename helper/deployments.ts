import { readFile, outputFile } from "fs-extra";
import { ethers, network } from "hardhat";

interface Deployments {
    [key: string]: string;
}

const file = `deployments/${network.name}.json`;

const readDeployments = async (): Promise<Deployments> =>
    readFile(file)
        .then((b) => JSON.parse(b.toString()))
        .catch(() => {
            return {};
        });

const writeDeployments = async (deployments: Deployments) => {
    const json = JSON.stringify(deployments, null, 2);
    await outputFile(file, json);
};

const assertContactExists = async (name: string) =>
    await ethers.getContractFactory(name).catch((e) => {
        throw `no contract with name "${name}" found`;
    });

export const saveDeployment = async (name: string, address: string, forceOverride: boolean = false) => {
    await assertContactExists(name);
    const deployments = await readDeployments();

    if (deployments[name] !== undefined && forceOverride === false) {
        throw "Deployment already exists";
    }

    deployments[name] = address;

    console.log(`Saving deployment "${name}" with Address ${address} on network: "${network.name}"`);

    await writeDeployments(deployments);
};

export const getDeployment = async (name: string): Promise<string> => {
    await assertContactExists(name);

    const deployments = await readDeployments();

    if (deployments[name] === undefined) {
        throw `Deployment "${name}" on network "${network.name}" not found`;
    }

    return deployments[name];
};

export const assertNotDeployed = async (name: string) => {
    const deployments = await readDeployments();
    if (deployments[name] !== undefined) throw `Deployment "${name}" already exists on network "${network.name}"`;
};
