import { network } from "hardhat";
import { config } from "../config";

export interface BeaconConfigs {
    [key: ChainName]: BeaconConfig;
}

export type ChainName = string;

export interface BeaconConfig {
    owner: string;
    signer: string;
    feeCollector: string;
    signatureTTLSeconds: number;
    traitURI: string;
    beaconURI: string;
    saveDeployment: boolean;
}

export const getConfig = (): BeaconConfig => {
    if (config[network.name] === undefined) throw `No config for network "${network.name}" found`;
    return config[network.name];
};
