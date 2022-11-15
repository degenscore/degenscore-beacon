# DegenScore Beacon Smartcontract

This repository contains the sources for the DegenScore Beacon Smartcontract.

The Beacon contract address can be found at: [beacon.degenscore.eth](https://etherscan.io/enslookup-search?search=beacon.degenscore.eth)

## Development

To deploy a local test version run:

```shell
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat --network localhost run scripts/deployBeacon.ts
```
