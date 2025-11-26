import { INBOX_ADDRESS, L1_PROXY_ADDRESS, PUBLIC_ADDRESS, PRIVATE_KEY, SEPOLIA_ETH_RPC, SEPOLIA_ARB_RPC, L2_PROXY_ADDRESS } from "../globals/globals.js";
import {ethers, providers, Wallet, BigNumber} from "ethers"; // v5
import {ParentToChildMessageGasEstimator, ParentTransactionReceipt, ParentToChildMessageStatus} from "@arbitrum/sdk";

export const initOwnerL1 = async() => {
  const abi = [
    "function initOwner() public"
  ];
  const provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
  const l1Wallet = new Wallet(PRIVATE_KEY, provider);
  //const contract = new ethers.Contract(L1_BRIDGE_ADDRESS, abi, l1Wallet);
  const contract = new ethers.Contract(L1_PROXY_ADDRESS, abi, l1Wallet);
  return await contract.initOwner();
}

export const setL2Address = async(address) =>{
  const abi = [
    "function changeL2Address(address _addr) public"
  ];
  const provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
  const l1Wallet = new Wallet(PRIVATE_KEY, provider);
  //const contract = new ethers.Contract(L1_BRIDGE_ADDRESS, abi, l1Wallet);
  const contract = new ethers.Contract(L1_PROXY_ADDRESS, abi, l1Wallet);
  return await contract.changeL2Address(address);
}

// Sets the Arbitrum Inbox address in L1 contract
export const setInboxAddress = async(address = INBOX_ADDRESS) =>{
  const abi = [
    "function changeInboxAddress(address _addr) public"
  ];
  const provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
  const l1Wallet = new Wallet(PRIVATE_KEY, provider);
  //const contract = new ethers.Contract(L1_BRIDGE_ADDRESS, abi, l1Wallet);
  const contract = new ethers.Contract(L1_PROXY_ADDRESS, abi, l1Wallet);
  return await contract.changeInboxAddress(address);
}

// Estimates cost parameters for Retryable ticket
const estimateGasTicket = async (l1Provider, l2Provider, l2_wallet_address, tree_number, root) => {
    // Calldata of L2 function
    const abi = [
      "function receiveRootFromL1(uint256 _tree_number, bytes32 _root) external"
  ];
  // En v6: ethers.Interface(abi_l2)
  const iface = new ethers.utils.Interface(abi);
  const calldata = iface.encodeFunctionData("receiveRootFromL1",[tree_number, root]);

 /**
 * Users can override the estimated gas params when sending an L1-L2 message
 * Note that this is totally optional
 * Here we include and example for how to provide these overriding values
 */

const RetryablesGasOverrides = {
  gasLimit: {
    base: undefined, // when undefined, the value will be estimated from rpc
    min: BigNumber.from(10000), // set a minimum gas limit, using 10000 as an example
    percentIncrease: BigNumber.from(30), // how much to increase the base for buffer
  },
  maxSubmissionFee: {
    base: undefined,
    percentIncrease: BigNumber.from(30),
  },
  maxFeePerGas: {
    base: undefined,
    percentIncrease: BigNumber.from(30),
  },
}

  const l1ToL2MessageGasEstimate = new ParentToChildMessageGasEstimator(l2Provider);
  const baseFee = (await l1Provider.getBlock('latest')).baseFeePerGas;

  const L1ToL2MessageGasParams = await l1ToL2MessageGasEstimate.estimateAll(
      {
        from: L1_PROXY_ADDRESS,
        to: L2_PROXY_ADDRESS,
        l2CallValue: 0,
        excessFeeRefundAddress: l2_wallet_address,
        callValueRefundAddress: l2_wallet_address,
        data: calldata,
      },
      baseFee,
      l1Provider,
      RetryablesGasOverrides 
    )
  
  console.log(
  `Current retryable base submission price is: ${L1ToL2MessageGasParams.maxSubmissionCost.toString()}`
  );
  console.log(
  `Current gas limit is: ${L1ToL2MessageGasParams.gasLimit.toString()}`
  );
  console.log(
  `Deposit (msg.value) is: ${L1ToL2MessageGasParams.deposit.toString()}`
  );

  return L1ToL2MessageGasParams;

}

// Sends a root from L1Contract to L2Contract
export const sendRootToL2 = async () => {

    const l1Provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
    const l2Provider = new providers.JsonRpcProvider(SEPOLIA_ARB_RPC);

    const l1Wallet = new Wallet(PRIVATE_KEY, l1Provider);
    const l2Wallet = new Wallet(PRIVATE_KEY, l2Provider);

    const abi = [
        "function merkleRoot() view returns (bytes32)",
        "function treeNumber() view returns (uint256)",
        "function rootHistory(uint256, uint256, bytes32) view returns (bool)",
        "function sendRootToL2(uint256 _tree_number, bytes32 _root, uint256 maxSubmissionCost, uint256 gasLimit, uint256 maxFeePerGas) public payable returns (uint256)"
    ]

    // Fetch root and tree number

    const proxy = new ethers.Contract(L1_PROXY_ADDRESS, abi, l1Wallet);

    const root = await proxy.merkleRoot();
    const tree_number = (await proxy.treeNumber()).toNumber();
    console.log("Root to send: " + root);
    console.log("Tree number: " + String(tree_number));

    console.log(await proxy.rootHistory(11155111, tree_number, root));

    console.log("Ticket gas estimations: ");
    const gasParams = await estimateGasTicket(l1Provider, l2Provider, l2Wallet.address, tree_number, root);
    const gasPriceBid = await l2Provider.getGasPrice();
    console.log(`L2 gas price: ${gasPriceBid.toString()}`);
    console.log("-------------------------------");

    // To simulate a ticket which fails to execute, hardcode a very low gasLimit e.g., 10

    // Estimates gas of the initial call to the L1 contract (L1 Wallet --> L1 Contract)
    // This is needed for Railgun broadcaster fees
    // Move this to a separate function?
    const tx_estimate = await proxy.estimateGas.sendRootToL2(
        tree_number, 
        root, 
        gasParams.maxSubmissionCost, 
        gasParams.gasLimit, 
        gasPriceBid, 
        {value: gasParams.deposit});

    console.log(`Gas estimate of call to L1 contract: ${tx_estimate}`);
    console.log("Calling the L1 contract...");

    // Calls L1 contract
    const tx = await proxy.sendRootToL2(
        tree_number,
        root,
        gasParams.maxSubmissionCost,
        gasParams.gasLimit,
        gasPriceBid,
        {value: gasParams.deposit}
    );

    const receipt = await tx.wait();
    console.log(`Txn confirmed on the parent chain: ${receipt.transactionHash}`);

    return receipt.transactionHash;
    
}

// Checks status of submitted Retryable Ticket
export const checkTicketStatus = async(tx_hash) => {
    const l1Provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
    const l2Provider = new providers.JsonRpcProvider(SEPOLIA_ARB_RPC);
    const l2Wallet = new Wallet(PRIVATE_KEY, l2Provider);

    const parentChainTransactionReceipt = new ParentTransactionReceipt(
      await l1Provider.getTransactionReceipt(tx_hash)
    );

    const messages = await parentChainTransactionReceipt.getParentToChildMessages(l2Wallet);
    const message = messages[0];

    if(message === undefined){
      console.log("Transaction isnt a L1-L2 message!");
      return;
    }

    console.log(
      'Waiting for the execution attempt of the transaction on the child chain. This may take up to 10-15 minutes',
    );
    const messageResult = await message.waitForStatus();
    const status = messageResult.status;
    
    if (status === ParentToChildMessageStatus.REDEEMED) {
      console.log(
        `Retryable ticket was successfully executed on the child chain: ${messageResult.childTxReceipt.transactionHash}`,
      );
    } else {
      console.log(
        `The retryable ticket failed to execute on the child chain. Status: ${ParentToChildMessageStatus[status]}`,
      );
    }
}

// Manually redeem ticket. Useful for tickets which failed execution due to not having enough gas
export const manualRedeem = async(tx_hash) => {
    const l1Provider = new providers.JsonRpcProvider(SEPOLIA_ETH_RPC);
    const l2Provider = new providers.JsonRpcProvider(SEPOLIA_ARB_RPC);
    const l2Wallet = new Wallet(PRIVATE_KEY, l2Provider);
    const parentChainTransactionReceipt = new ParentTransactionReceipt(
      await l1Provider.getTransactionReceipt(tx_hash)
    );

    console.log("Waiting for message...");
    const messages = await parentChainTransactionReceipt.getParentToChildMessages(l2Wallet);
    const message = messages[0];
    
    if(message === undefined){
      console.log("Transaction isnt a L1-L2 message!");
      return;
    }

    const messageResult = await message.waitForStatus();
    const status = messageResult.status;
    if (status === ParentToChildMessageStatus.REDEEMED){
        console.log("Ticket was successfully executed, nothing to do here");
    } else {
        console.log(`Ticket status: ${ParentToChildMessageStatus[status]}`);
        console.log("Reedeming the ticket...");
        const tx = await message.redeem();
        const receipt = await tx.waitForRedeem();
        console.log("The ticket was successfully redeemed");

        return receipt.transactionHash;
    }
}
