pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "./ConicoinToken.sol";

contract ConicoinCrowdsale is Ownable {
    using SafeMath for uint256;

    /// @dev Public variables
    address public team;
    uint public tokensForSale;
    uint public tokenPrice;
    ConicoinToken public token;

    /// @dev Private variables
    uint tokensSold = 0;

    /// @dev Constructor
    constructor(ConicoinToken _token, address _team, uint _tokensForSale, uint _tokenPrice) public {
        token = _token;
        team = _team;
        tokensForSale = _tokensForSale;
        tokenPrice = _tokenPrice;
    }

    function() external payable {
        buyFor(msg.sender);
    }

    /// @dev Public methods

    function buyFor(address _investor) public payable {
        require(msg.value > 0);
        buy(_investor, msg.value.div(tokenPrice));
    }

    function getTeam() view external returns (address) {
        return team;
    }

    /// @dev OnlyOwner methods

    function changeTokenPrice(uint _tokenPrice) onlyOwner external {
        tokenPrice = _tokenPrice;
    }

    function changeTeamAddress(address _team) onlyOwner external {
        team = _team;
    }

    /// TODO: - Add Tests
    function withdrawEther(uint _value) onlyOwner external {
        team.transfer(_value);
    }

    /// TODO: - Add Tests
    function withdrawToken(address _tokenContract, uint _value) onlyOwner external {
        ERC20 _token = ERC20(_tokenContract);
        _token.transfer(team, _value);
    }

    /// @dev Internal methods

    function buy(address _investor, uint _value) internal {
        require(tokensSold.add(_value) <= tokensForSale);

        token.mint(_investor, _value);
        tokensSold = tokensSold.add(_value);
    }

}
