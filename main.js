import {L1_PROXY_ADDRESS, L2_PROXY_ADDRESS } from "./src/globals/globals.js";
import { setL2Address, setInboxAddress, sendRootToL2, checkTicketStatus, manualRedeem, initOwnerL1 } from "./src/bridge/l1_to_l2.js";
import { setL1Address, sendRootToL1, checkL2MessageStatus, initOwnerL2 } from "./src/bridge/l2_to_l1.js";
import { checkL2RootInL1, checkL1RootInL2, checkL1BridgeOwner } from "./src/bridge/check_roots.js";

const main = async() =>{
    
    // Sets addresses (only needs to be done after deploying for the first time)
    /*
    await initOwnerL1();
    await initOwnerL2();
    await setL1Address(L1_PROXY_ADDRESS);
    await setInboxAddress()
    await setL2Address(L2_PROXY_ADDRESS);
    */
    
    // L1 --> L2
    await sendRootToL2();
    const ticket_tx = ""
    await checkTicketStatus(ticket_tx);
    await manualRedeem(ticket_tx);
    
    // L2 --> L1
    //await sendRootToL1();
    // Check tx id on arbiscan
    const tx_id = "0xa31f46c3a4962f0e88da175648bdffb8fc7fed7908c8c146be0e2190123c9ce0";
    await checkL2MessageStatus(tx_id);

    // Check roots
    /*
    rootL1 = "..."
    rootL2 = "..."
    console.log(await checkL1RootInL2(rootL1, 0));
    console.log(await checkL2RootInL1(rootL2, 0));
    */
}

main();