pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title ConicoinToken
 * @dev Conicoin Token description. todo: fill letter
 */

contract ConicoinToken is StandardToken, Ownable {
    event Mint(address indexed to, uint256 amount);
    event MintFinished();

    // ERC20 Token full name
    string public constant name = "Conicoin Token";

    // ERC20 Token ISO symbol
    string public constant symbol = "CON";

    // ERC20 Token decimals
    uint32 public constant decimals = 18;

    // Finish crowdsale flag
    bool public mintingFinished = false;

    // Maximum tokens amount
    uint public tokenLimit;

    // Crowdsale address
    address public crowdsale;

    // Insurance addressed
    address public insurance;

    // -----------------------------------------
    // ConicoinInsurance modifiers
    // -----------------------------------------

    /**
     * @dev Throws if called by any account other than the crowdsale or owner.
     * Minting must be available
     */
    modifier canMint() {
        require(!mintingFinished);
        require(crowdsale != address(0));
        require(msg.sender == crowdsale || msg.sender == owner);
        _;
    }

    /**
     * @dev Throws if called by any account other than the incurance.
     * Minting must be finished
     */
    modifier canInsure() {
        require(mintingFinished);
        require(insurance != address(0));
        require(msg.sender == insurance);
        _;
    }

    // -----------------------------------------
    // ConicoinInsurance contract initializer
    // -----------------------------------------

    /**
     * @dev The ConicoinToken constructor sets maximum tokens amount
     * @param _tokenLimit Number
     */
    constructor(uint _tokenLimit) public {
        tokenLimit = _tokenLimit;
    }

    // -----------------------------------------
    // ConicoinInsurance external interface
    // -----------------------------------------

    /**
     * @dev Mint few tokens and transefer them to some address.
     * @param _to Address
     * @param _amount Number
     */
    function mint(address _to, uint _amount) canMint public returns (bool) {
        require(totalSupply_.add(_amount) <= tokenLimit);

        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }

    /**
     * @dev Finish minting
     * @return Bool
     */
    function finishMinting() onlyOwner external returns (bool) {
        require(tokenLimit.sub(totalSupply_) >= 0);

        mint(owner, tokenLimit.sub(totalSupply_));
        mintingFinished = true;
        emit MintFinished();
        return true;
    }

    /**
     * @dev Insure investment with Conicoin tokens.
     * Available for ConicoinInsurance contract call only.
     * @param _from Address
     * @param _value Number
     */
    function insure(address _from, uint _value) canInsure external {
        require(insurance != address(0));
        require(_value <= balances[_from]);

        balances[_from] = balances[_from].sub(_value);
        balances[insurance] = balances[insurance].add(_value);
        emit Transfer(_from, insurance, _value);
    }

    /**
     * @dev Setting crowdsale address witch available to mint
     */
    function setCrowdsaleAddress(address _crowdsale) onlyOwner external {
        crowdsale = _crowdsale;
    }

    /**
     * @dev Setting insurance address witch available to manage tokens
     */
    function setInsuranceAddress(address _insurance) onlyOwner external {
        insurance = _insurance;
    }

    /**
     * @dev Withdraw the accumulated ethereum
     */
    function withdrawEther(uint _value) onlyOwner external {
        owner.transfer(_value);
    }

    /**
     * @dev Withdraw the accumulated ERC20 tokens from contract account
     * Not applicable to ConicoinToken because they are on the account of the owner or the account of the user
     */
    function withdrawToken(address _tokenContract, uint _value) onlyOwner external {
        ERC20 _token = ERC20(_tokenContract);
        _token.transfer(owner, _value);
    }

}
