import { BeaconConfigs } from "./helper/config";

const minute = 60;

export const config: BeaconConfigs = {
    hardhat: {
        owner: process.env.OWNER || "0xa891cC0bD0bc71705D56B27796BB2375Eb6d180B",
        signer: "0xbdeea4d85f613c7b10cf9fc9cdedf608ecb29cab",
        feeCollector: process.env.FEE_COLLECTOR || "0xa891cC0bD0bc71705D56B27796BB2375Eb6d180B",
        signatureTTLSeconds: 5 * minute,
        traitURI: "http://localhost:8080/v1/trait/",
        beaconURI: "http://localhost:8080/v1/beacon/",
        saveDeployment: false,
    },
    localhost: {
        owner: process.env.OWNER || "0xa891cC0bD0bc71705D56B27796BB2375Eb6d180B",
        signer: "0xbdeea4d85f613c7b10cf9fc9cdedf608ecb29cab",
        feeCollector: process.env.FEE_COLLECTOR || "0xa891cC0bD0bc71705D56B27796BB2375Eb6d180B",
        signatureTTLSeconds: 5 * minute,
        traitURI: "http://localhost:8080/v1/trait/",
        beaconURI: "http://localhost:8080/v1/beacon/",
        saveDeployment: false,
    },
    goerli: {
        owner: "0x395e51f7Ec41445Be741dA90880119e1c642E217",
        signer: "0x674f4150c82899278d86be4091ae9e5d58b6ee89",
        feeCollector: "0xa891cC0bD0bc71705D56B27796BB2375Eb6d180B",
        signatureTTLSeconds: 5 * minute,
        traitURI: "https://goerli-beacon.degenscore.com/v1/trait/",
        beaconURI: "https://goerli-beacon.degenscore.com/v1/beacon/",
        saveDeployment: true,
    },
    mainnet: {
        owner: "0x0fE8Da8304eDaBdA0fa9470B53c172e1b31d4A42", // degenscore.eth
        signer: "0xdFf3065be2b6161fDF57fbD7a02FCC79Ee6FF2e7", // signer.beacon.degenscore.eth
        feeCollector: "0x1465e6cAE990CA386382e43291C1246EAC4A2Ca2", // feecollector.degenscore.eth
        signatureTTLSeconds: 5 * minute,
        traitURI: "https://beacon.degenscore.com/v1/trait/",
        beaconURI: "https://beacon.degenscore.com/v1/beacon/",
        saveDeployment: true,
    },
};
