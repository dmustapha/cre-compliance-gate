// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ComplianceVault
/// @notice ETH vault with CRE-gated deposits. Only the registered CRE workflow
///         address can call deposit(). Withdrawals are permissionless for depositors.
contract ComplianceVault is Ownable {
    // --- State ---
    mapping(address => uint256) public balances;
    address public creAddress;
    uint256 public totalDeposits;

    // --- Events ---
    event Deposit(address indexed depositor, uint256 amount, uint256 timestamp);
    event Withdrawal(address indexed withdrawer, uint256 amount, uint256 timestamp);
    event CREAddressUpdated(address indexed oldAddress, address indexed newAddress);

    // --- Errors ---
    error OnlyCRE();
    error InsufficientBalance();
    error ZeroAmount();
    error TransferFailed();

    // --- Constructor ---
    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- Modifiers ---
    modifier onlyCRE() {
        if (msg.sender != creAddress) revert OnlyCRE();
        _;
    }

    // --- External Functions ---

    /// @notice Deposit ETH for a specific depositor. Only callable by CRE workflow.
    /// @param depositor The address to credit the deposit to.
    function deposit(address depositor) external payable onlyCRE {
        if (msg.value == 0) revert ZeroAmount();

        balances[depositor] += msg.value;
        totalDeposits += msg.value;

        emit Deposit(depositor, msg.value, block.timestamp);
    }

    /// @notice Withdraw ETH from the vault. Caller withdraws their own balance.
    /// @param amount The amount of ETH to withdraw in wei.
    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawal(msg.sender, amount, block.timestamp);
    }

    /// @notice Set the CRE workflow address that is authorized to call deposit().
    /// @param _creAddress The CRE workflow forwarder address on this chain.
    function setCREAddress(address _creAddress) external onlyOwner {
        address oldAddress = creAddress;
        creAddress = _creAddress;
        emit CREAddressUpdated(oldAddress, _creAddress);
    }

    /// @notice Get the balance of a specific address.
    /// @param user The address to query.
    /// @return The balance in wei.
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    /// @notice Allow the contract to receive ETH directly (for CRE forwarding).
    receive() external payable {}
}
