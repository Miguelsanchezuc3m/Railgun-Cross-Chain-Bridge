import {L1_PROXY_ADDRESS, PUBLIC_ADDRESS, PRIVATE_KEY, SEPOLIA_ETH_RPC, SEPOLIA_ARB_RPC, L2_PROXY_ADDRESS } from "../globals/globals.js";

import {ethers, providers, Wallet, BigNumber} from "ethers"; // v5
import { ChildTransactionReceipt, ChildToParentMessageStatus }  from "@arbitrum/sdk";

export const initOwnerL2 = async() => {
  const abi = [
    "function initOwner() public"
  ];
  const provider = new providers.JsonRpcProvider(SEPOLIA_ARB_RPC);
  const l2Wallet = new Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(L2_PROXY_ADDRESS, abi, l2Wallet);
  return await contract.initOwner();
}

// Sets L1 proxy address on L2 contract
export const setL1Address = async(address) =>{
  const abi = [
    "function changeL1Address(address _addr) public"
  ];
  const provider = new providers.JsonRpcProvider(SEPOLIA_ARB_RPC);
  const l2Wallet = new Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(L2_PROXY_ADDRESS, abi, l2Wallet);
  return await contract.changeL1Address(address);
}

// Sends root from L2 contract to L1 contract
export const sendRootToL1 = async () => {
    const l2Provider = new providers.JsonRpcProvider(SEPOLIA_ARB_RPC);
    const l2Wallet = new Wallet(PRIVATE_KEY, l2Provider);

    const abi = [
        "function sendRootToL1(uint256 _tree_number, bytes32 _root) public returns (uint256)",
        "function merkleRoot() view returns (bytes32)",
        "function treeNumber() view returns (uint256)"
    ]

    const contract = new ethers.Contract(L2_PROXY_ADDRESS, abi, l2Wallet);
    
    const root = await contract.merkleRoot();
    const tree_number = (await contract.treeNumber()).toNumber();
    console.log("Root to send: " + root);
    console.log("Tree number: " + String(tree_number));    
    
    // Estimates gas of call to the L2 contract (L2 Wallet --> L2 Contract)
    // Needed for Railgun broadcaster fees
    // Move this to a separate function?
    const tx_estimate = await contract.estimateGas.sendRootToL1(tree_number, root);
    console.log(`Gas estimate: ${tx_estimate}`);

    const tx = await contract.sendRootToL1(tree_number, root);

    return tx.hash;
}

// Checks L2-L1 message status, waits until it is confirmed and then executes it.
export const checkL2MessageStatus = async (transactionHash) => {
    
    const l1Provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
    const l2Provider = new providers.JsonRpcProvider(SEPOLIA_ARB_RPC);
    const l1Wallet = new Wallet(PRIVATE_KEY, l1Provider);
  
    const receipt = await l2Provider.getTransactionReceipt(transactionHash);
    const transactionReceipt = new ChildTransactionReceipt(receipt);
  
    const messages = await transactionReceipt.getChildToParentMessages(l1Wallet);
    const childToParentMessage = messages[0];
  
    const status = await childToParentMessage.status(l2Provider);
  
    // Checks if message has been confirmed
    if (status == ChildToParentMessageStatus.EXECUTED) {
      throw new Error(`Message already executed! Nothing else to do here`);
    } if(status == ChildToParentMessageStatus.UNCONFIRMED){
      console.log("Message is not confirmed");
    } if (status == ChildToParentMessageStatus.CONFIRMED){
      console.log("Message is confirmed")
    }
  
    // If unconfirmed, waits until it confirms
    const timeToWaitMs = 1000 * 60;
    console.log(
      "Waiting for the outbox entry to be created. This only happens when the child chain's block is confirmed on the parent chain, around ~1 week after it's creation (by default).",
    );
    await childToParentMessage.waitUntilReadyToExecute(l2Provider, timeToWaitMs);
    console.log('Outbox entry exists! Trying to execute now');
  
    // Executes the message
    const executeTransaction = await childToParentMessage.execute(l2Provider);
    const executeTransactionReceipt = await executeTransaction.wait();
    console.log('Done! Your transaction is executed', executeTransactionReceipt);
  }

// Estimates gas of the L1 Wallet - Outbox call
const estimateGasOutbox = async(tree_number, root) =>{
    const abi = [
      "function receiveRootFromL2(uint256 _tree_number, bytes32 _root) external"
    ];
    const l1Provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
    const contract = new ethers.Contract(L1_BRIDGE_ADDRESS, abi, l1Provider);
    const tx_estimate = await contract.estimateGas.receiveRootFromL2(tree_number, root);
    
    return tx_estimate;
}

// Checks if a L2 root exists in L1's Contract, i.e. if L2-L1 message was succesful
const checkL2RootL1 = async(tree_number, root)=>{
  const abi = [
    "function l2RootHistory(uint256 treeNumber, bytes32 root) external view returns (bool)"
  ]

  const l1Provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
  const contract = new ethers.Contract(L1_BRIDGE_ADDRESS, abi, l1Provider);
  console.log(await contract.l2RootHistory(tree_number, root));
}


const tree_number = 0;
const root = "0x1111111111111111111111111111111111111111111111111111111111111111";

//await addRootL2(tree_number, root);
//const tx = await sendRootToL1(tree_number, root);
//await checkStatus("0x3f3205b0d6786088bcd9d069bc1b2d7b39d89100bb7f23528f4c114c80e66077");
//await checkL2RootL1(tree_number, root);
