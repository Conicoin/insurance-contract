pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../node_modules/zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "./ConicoinToken.sol";

/**
 * @title ConicoinInsurance
 * @dev Conicoin Insurance description. todo: fill letter
 */

contract ConicoinInsurance is Ownable {
    using SafeMath for uint256;

    /**
     * @dev Throws if called by any account other than the owner or partner.
     */
    modifier onlyPermitted(address _address) {
      require(msg.sender == owner || msg.sender == _address);
      _;
    }

    // Conicoin insurance programm partner
    struct Partner {
        // Address to withdraw collected money
        address wallet;

        // Exchange rate 1 token = {RATE} wei
        uint rate;

        // Insurance deadline (unix timestamp in seconds)
        uint deadline;

        // Amount managed by insurance
        uint initialHold;

        // JSON format assets
        string assets;

        // Partner index
        uint index;

        // Existence helper
        bool exists;

        // Investors
        address[] investors;

        // Holded ethereum balance
        mapping (address => uint) invested;
    }

    // Conicoin ERC20 Token
    ConicoinToken conicoinToken;

    // Partners map
    mapping (address => Partner) partners;

    // Invested amount map
    mapping (address => uint) investments;

    // Partners addressed list
    address[] partnerList;

    // Insurance with tokens price multiplier
    uint tokenMultiplier;

    // Insurance with ethers price multiplier
    uint etherMultiplier;


    // -----------------------------------------
    // ConicoinInsurance contract initializer
    // -----------------------------------------

    /**
     * @dev ConicoinInsurance initializer
     */
    constructor(ConicoinToken _conicoinToken, uint _tokenMultiplier, uint _etherMultiplier) public {
        conicoinToken = _conicoinToken;
        tokenMultiplier = _tokenMultiplier;
        etherMultiplier = _etherMultiplier;
    }

    // -----------------------------------------
    // ConicoinInsurance partners managment external interface
    // -----------------------------------------

    /**
     * @dev Adding partner
     * @param _address Partner ICO contract address
     * @param _wallet Address where funds will be sent from the tokens sale
     * @param _rate Token cost ratio
     * @param _initialHold Number of tokens for sale
     * @param _deadline Deadline unix timestamp
     * @param _assets JSON format assets string
     */
    function addPartner(address _address,
                        address _wallet,
                        uint _rate,
                        uint _initialHold,
                        uint _deadline,
                        string _assets) onlyOwner external {

        require(!isPartnerExists(_address));
        require(_initialHold > 0);
        require(_rate > 0);
        require(_deadline > now);
        require(ERC20(_address).balanceOf(this) == _initialHold);

        address[] memory investors;
        partners[_address] = Partner(_wallet,
                                     _rate,
                                     _deadline,
                                     _initialHold,
                                     _assets,
                                     partnerList.push(_address) - 1,
                                     true,
                                     investors);
    }

    /**
     * @dev Delete partner from Conicoin insurance programm
     * @param _address address
     */
    function deletePartner(address _address) onlyPermitted(partners[_address].wallet) public {
        require(isPartnerExists(_address));
        require(investments[_address] == 0);

        uint i = 0;
        while (i < partners[_address].investors.length) {

            address investor = partners[_address].investors[i];
            uint invested = partners[_address].invested[investor];

            require(invested == 0);

            i += 1;
        }

        uint toDelete = partners[_address].index;
        address lastAddress = partnerList[partnerList.length-1];
        partnerList[toDelete] = lastAddress;
        partners[lastAddress].index = toDelete;
        partnerList.length--;

        delete partners[_address];
    }

    /**
     * @dev Return partner info
     * @param _address address
     */
    function getPartner(address _address) view external returns (address, uint, uint, uint, uint, string) {
        require(isPartnerExists(_address));

        return (
            partners[_address].wallet,
            partners[_address].rate,
            partners[_address].deadline,
            partners[_address].initialHold,
            investments[_address],
            partners[_address].assets
        );
    }

    /**
     * @dev Get partners list
     * @return Array
     */
    function getPartners() view external returns (address[]) {
        return partnerList;
    }

    /**
     * @dev Holded ethereum balance
     * @param _address address
     * @param _from address
     * @return Number
     */
    function getInvested(address _address, address _from) view external returns (uint) {
        return partners[_address].invested[_from];
    }

    // -----------------------------------------
    // ConicoinInsurance funds managment external interface
    // -----------------------------------------

    /**
     * @dev Invest using conicoin insurance programm with Conicoin Tokens
     * @param _address address Partner address
     */
    function investWithTokens(address _address) payable external {
        require(isPartnerExists(_address));
        require(!isDeadlineCame(_address));

        uint tokensValue = msg.value.div(partners[_address].rate);
        uint residualBalance = ERC20(_address).balanceOf(this);
        require(tokensValue <= residualBalance);

        uint value = msg.value.div(tokenMultiplier);
        conicoinToken.insure(msg.sender, value);

        invest(_address, msg.value);
    }

    /**
     * @dev Invest using conicoin insurance programm with Ethereums
     * @param _address address Partner address
     */
    function investWithEthers(address _address) payable external {
        require(isPartnerExists(_address));
        require(!isDeadlineCame(_address));

        uint value = msg.value.mul(etherMultiplier).div(etherMultiplier+1);
        uint tokensValue = value.div(partners[_address].rate);

        require(tokensValue > 0);

        uint residualBalance = ERC20(_address).balanceOf(this);
        require(tokensValue <= residualBalance);

        invest(_address, value);
    }

    /**
     * @dev Return the invested funds and discard the tokens
     * @param _address address
     */
    function returnInvestment(address _address) external {
        require(isPartnerExists(_address));
        require(!isDeadlineCame(_address));
        require(partners[_address].invested[msg.sender] > 0);

        uint invested = partners[_address].invested[msg.sender];
        msg.sender.transfer(invested);

        partners[_address].invested[msg.sender] = 0;
        investments[_address] = investments[_address].sub(invested);
    }

    /**
     * @dev Confirm investment and get partner tokens
     * @param _address address
     */
     function confirmInvestment(address _address) external {
         require(isPartnerExists(_address));
         require(partners[_address].invested[msg.sender] > 0);

         uint rate = partners[_address].rate;
         uint invested = partners[_address].invested[msg.sender];
         uint tokenBalance = invested.div(rate);

         ERC20 token = ERC20(_address);
         token.transfer(msg.sender, tokenBalance);

         if (investments[_address] != 0) {
             investments[_address] = investments[_address].sub(invested);
             partners[_address].wallet.transfer(partners[_address].invested[msg.sender]);
         }
         partners[_address].invested[msg.sender] = 0;
     }

     /* *
      * @dev Finish offering, withdraw ethers
      * and send tokens to investors
      * available only for partners
     */
     function finishOffering(address _address) onlyPermitted(partners[_address].wallet) external {
         require(isPartnerExists(_address));
         require(isDeadlineCame(_address));
         require(investments[_address] != 0);

         ERC20 token = ERC20(_address);
         uint rate = partners[_address].rate;

         uint i = 0;
         while (i < partners[_address].investors.length) {

             address investor = partners[_address].investors[i];
             uint invested = partners[_address].invested[investor];

             if (invested == 0) {
                 i += 1;
                 continue;
             }

             uint investorTokenBalance = invested.div(rate);

             token.transfer(investor, investorTokenBalance);

             partners[_address].invested[investor] = 0;

             i += 1;
         }

         partners[_address].wallet.transfer(investments[_address]);
         investments[_address] = 0;

         uint unsoldTokenBalance = token.balanceOf(this);
         token.transfer(partners[_address].wallet, unsoldTokenBalance);

         deletePartner(_address);
     }

     /* *
      * @dev Finish offering and withdraw ethers
      * without sending tokens to investors
      * available only for partners
     */
     function withdrawEarned(address _address) onlyPermitted(partners[_address].wallet) external {
         require(isPartnerExists(_address));
         require(isDeadlineCame(_address));
         require(investments[_address] != 0);

         partners[_address].wallet.transfer(investments[_address]);

         ERC20 token = ERC20(_address);
         uint rate = partners[_address].rate;

         uint tokenValue = investments[_address].div(rate);
         uint allTokens = token.balanceOf(this);
         uint unsoldTokenBalance = allTokens.sub(tokenValue);

         token.transfer(partners[_address].wallet, unsoldTokenBalance);

         investments[_address] = 0;
     }

    // -----------------------------------------
    // ConicoinInsurance settings external interface
    // -----------------------------------------

    /**
     * @dev TokenMultiplier setter. Available only for owner.
     * @param _tokenMultiplier Number
     */
    function setTokenMultiplier(uint _tokenMultiplier) onlyOwner external {
        tokenMultiplier = _tokenMultiplier;
    }

    /**
     * @dev EtherMultiplier setter. Available only for owner.
     * @param _etherMultiplier Number
     */
    function setEtherMultiplier(uint _etherMultiplier) onlyOwner external {
        etherMultiplier = _etherMultiplier;
    }

    // -----------------------------------------
    // ConicoinInsurance internal interface
    // -----------------------------------------

    /**
     * @dev Holded ethereums balance
     * @param _address address
     * @return Bool
     */
    function isPartnerExists(address _address) view internal returns (bool) {
        return partners[_address].exists;
    }

    /**
     * @dev Is deadline period came
     * @param _address address
     * @return Bool
     */
    function isDeadlineCame(address _address) view internal returns (bool) {
        return partners[_address].deadline < now;
    }

    /**
     * @dev Invest using conicoin insurance programm
     * @param _address address
     */
    function invest(address _address, uint _value) internal {
        partners[_address].investors.push(msg.sender);
        partners[_address].invested[msg.sender] = partners[_address].invested[msg.sender].add(_value);
        investments[_address] = investments[_address].add(_value);
    }

}
