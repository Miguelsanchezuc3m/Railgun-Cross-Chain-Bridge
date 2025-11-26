import dotenv from "dotenv";
dotenv.config();
// All contracts are deployed in either Sepolia Ethereum (L1) or Sepolia Arbitrum (L2)

// Arbitrum Inbox
export const INBOX_ADDRESS = "0xaAe29B0366299461418F5324a79Afc425BE5ae21";

// Test Railgun Contracts
export const L1_PROXY_ADDRESS = "0x2fcFb0b38C0A52664deb267dEfCD7AF44631cDc1";
export const L2_PROXY_ADDRESS = "0x6811Dfa0498AB4dF5A7B75A188651E8326382ad7";
export const SEPOLIA_ETH_CHAIN_ID = 11155111;
export const SEPOLIA_ARB_CHAIN_ID = 421614;

// Environment variables
export const PRIVATE_KEY = process.env.PRIVATE_KEY;
export const PUBLIC_ADDRESS = process.env.PUBLIC_ADDRESS;
export const SEPOLIA_ETH_RPC = process.env.SEPOLIA_ETH_RPC;
export const SEPOLIA_ARB_RPC = process.env.SEPOLIA_ARB_RPC;
