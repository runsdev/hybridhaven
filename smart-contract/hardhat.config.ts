import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
};

export default config;

// import { task } from "hardhat/config";
// import "@nomiclabs/hardhat-waffle";
// import "@nomiclabs/hardhat-etherscan";
// import "hardhat-gas-reporter";
// import "solidity-coverage";

// const { ALCHEMY_API_KEY, ROPSTEN_PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

// export default {
//   solidity: "0.8.0",
//   networks: {
//     ropsten: {
//       url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
//       accounts: [`0x${ROPSTEN_PRIVATE_KEY}`],
//     },
//   },
//   etherscan: {
//     apiKey: ETHERSCAN_API_KEY,
//   },
//   gasReporter: {
//     enabled: true,
//     currency: "USD",
//   },
// };