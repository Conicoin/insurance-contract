pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract TestToken is StandardToken {

    /// @dev Public constants
    string public constant name = "C Test ICO Token";
    string public constant symbol = "CTT";
    uint32 public constant decimals = 2;

    constructor(uint _totalSupply) public {
        totalSupply_ = _totalSupply;
        balances[msg.sender] = _totalSupply;
        emit Transfer(msg.sender, msg.sender, _totalSupply);
    }
}
