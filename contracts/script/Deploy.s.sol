// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceVault} from "../src/ComplianceVault.sol";

contract DeployComplianceVault is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying ComplianceVault...");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        ComplianceVault vault = new ComplianceVault(deployer);

        vm.stopBroadcast();

        console.log("ComplianceVault deployed at:", address(vault));
        console.log("Owner:", deployer);
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Record the vault address in .env as VAULT_ADDRESS");
        console.log("2. Call setCREAddress() with your CRE workflow forwarder address");
    }
}
