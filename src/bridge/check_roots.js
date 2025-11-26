import { SEPOLIA_ETH_CHAIN_ID, SEPOLIA_ARB_CHAIN_ID, L1_PROXY_ADDRESS, SEPOLIA_ETH_RPC, SEPOLIA_ARB_RPC, L2_PROXY_ADDRESS } from "../globals/globals.js";
import {ethers, providers, Wallet, BigNumber} from "ethers"; // v5


// Checks if a L1 root has been sent to L2
export const checkL1RootInL2 = async(root, tree_number) => {
    const abi = [
        "function rootHistory(uint256, uint256, bytes32) view returns (bool)",
    ]
    const l2Provider = new providers.JsonRpcProvider(SEPOLIA_ARB_RPC);
    const proxy = new ethers.Contract(L2_PROXY_ADDRESS, abi, l2Provider);
    return await proxy.rootHistory(SEPOLIA_ETH_CHAIN_ID, tree_number, root);
}

// Checks if a L2 root has been sent to L1
export const checkL2RootInL1 = async(root, tree_number) => {
    const abi = [
        "function rootHistory(uint256, uint256, bytes32) view returns (bool)",
    ]
    const l1Provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
    const proxy = new ethers.Contract(L1_PROXY_ADDRESS, abi, l1Provider);
    return await proxy.rootHistory(SEPOLIA_ARB_CHAIN_ID, tree_number, root);
}

export const checkL1BridgeOwner = async() =>{
    const abi = [
        "function bridgeOwner() view returns (string)"
    ]
    const l1Provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
    const proxy = new ethers.Contract(L1_PROXY_ADDRESS, abi, l1Provider);
    return await proxy.bridgeOwner();
}