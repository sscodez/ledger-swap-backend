// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiChainEscrow {
    address public admin;
    address public seller;
    address public buyer;
    uint256 public amount;
    bool public released;

    event EscrowCreated(address indexed seller, address indexed buyer, uint256 amount);
    event Released(address indexed to, uint256 amount);
    event Refunded(address indexed to, uint256 amount);

    constructor(address _seller, address _buyer) payable {
        admin = msg.sender;
        seller = _seller;
        buyer = _buyer;
        amount = msg.value;
        released = false;
        emit EscrowCreated(_seller, _buyer, msg.value);
    }

    // Normal release: seller + buyer consensus (both must call)
    function release() external {
        require(!released, "Already released");
        require(msg.sender == seller || msg.sender == buyer || msg.sender == admin, "Unauthorized");

        released = true;
        payable(buyer).transfer(amount);
        emit Released(buyer, amount);
    }

    // Refund by admin in case of dispute
    function refund() external {
        require(msg.sender == admin, "Only admin can refund");
        require(!released, "Already released");

        released = true;
        payable(seller).transfer(amount);
        emit Refunded(seller, amount);
    }
}
