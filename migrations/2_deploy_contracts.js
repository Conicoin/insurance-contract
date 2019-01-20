const ConicoinToken = artifacts.require('ConicoinToken');
const ConicoinCrowdsale = artifacts.require('ConicoinCrowdsale');
const ConicoinInsurance = artifacts.require('ConicoinInsurance');
const TestToken = artifacts.require('TestToken');

/// ConicoinCrowdsale Init params
let teamAddress = "0xAa2c9695F6c354CEF54dDA956Ec23233355Debc4";
let tokensForCrowdsale = 20000000; // 20 000 000
let tokenPrice = 5e15; // 0.005 Eth

/// ConicoinToken Init params
let tokenLimit = 2**29; // 536,870,912

/// TestToken Init params
let testTokenSupply = 132272836;

/// ConicoinInsurance Init params;
let tokenMultiplier = 1e18;
let etherMultiplier = 5000;

module.exports = async function(deployer) {
    deployer.then(async () => {

        await deployer.deploy(ConicoinToken, tokenLimit);

        let conicoinToken = await ConicoinToken.deployed();
        await deployer.deploy(ConicoinCrowdsale, teamAddress, tokensForCrowdsale, tokenPrice, conicoinToken.address);

        let crowdsale = await ConicoinCrowdsale.deployed();
        await conicoinToken.setCrowdsaleAddress(crowdsale.address);

        await deployer.deploy(ConicoinInsurance, conicoinToken.address, tokenMultiplier, etherMultiplier);

        let insurance = await ConicoinInsurance.deployed();
        await conicoinToken.setInsuranceAddress(insurance.address);

        await deployer.deploy(TestToken, testTokenSupply);

        console.log("---------------- Contracts Addresses -------------------\n");
        console.log("conicoinToken: " + ConicoinToken.address);
        console.log("crowdsale: " + ConicoinCrowdsale.address);
        console.log("insurance: " + ConicoinInsurance.address);
        console.log("testToken: " + TestToken.address);
        console.log("\n---------------- Contracts ABI -------------------\n");
        console.log("conicoinToken: " + JSON.stringify(ConicoinToken.abi) +'\n');
        console.log("crowdsale: " + JSON.stringify(ConicoinCrowdsale.abi) +'\n');
        console.log("insurance: " + JSON.stringify(ConicoinInsurance.abi) +'\n');
        console.log("testToken: " + JSON.stringify(TestToken.abi) +'\n');
    });

}
