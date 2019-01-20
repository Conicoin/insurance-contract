'use strict';

import expectThrow from './helpers/expectThrow';

const ConicoinToken = artifacts.require('ConicoinToken');
const ConicoinCrowdsale = artifacts.require('ConicoinCrowdsale')
const TestToken = artifacts.require('TestToken');
const ConicoinInsurance = artifacts.require('ConicoinInsurance');

const sleep = m => new Promise(r => setTimeout(r, m));

let denominationUnit = "ether";
function money(number) {
	return web3.toWei(number, denominationUnit);
}

/// ConicoinCrowdsale Init params
let tokensForCrowdsale = 20000000; // 20 000 000
let tokenPrice = 5e15; // 0.005 Eth

/// ConicoinToken Init params
let tokenLimit = 2**29; // 536,870,912

/// TestToken Init params
let testTokenTotalSupply = 1e14;

/// ConicoinInsurance Init params;
let tokenMultiplier = 1e18;
let etherMultiplier = 5000;

// Assets
let assets = JSON.stringify({
	"name": "Test Insurance Token",
	"symbol": "TIT",
	"decimals": 2,
	"icon": "https://c1.staticflickr.com/8/7639/28286579442_d94bdee593.jpg",
	"link": "https://www.google.com",
	"description": "An initial coin offering (ICO) or initial currency offering is a type of funding using cryptocurrencies. Mostly the process is done by crowdfunding but private ICO's are becoming more common. In an ICO, a quantity of cryptocurrency is sold in the form of tokens (coins) to speculators or investors, in exchange for legal tender or other cryptocurrencies such as Bitcoin or Ethereum. The tokens sold are promoted as future functional units of currency if or when the ICO's funding goal is met and the project launches. In some cases like Ethereum the tokens are required to use the system for its purposes."
});


contract('Token', function(accounts) {

    /// @dev ganache accounts
    let owner = accounts[0];
    let acc1 = accounts[1];
    let acc2 = accounts[2];
    let acc3 = accounts[3];
	let partnerAcc = accounts[98];
	let team = accounts[99];

    /// @dev instances of contracts
    let conicoinToken;
    let crowdsale;
    let testToken;
    let insurance;

    /// @dev runs before each "it" function
    beforeEach(async function () {
		conicoinToken = await ConicoinToken.new(tokenLimit);
		crowdsale = await ConicoinCrowdsale.new(conicoinToken.address, team, tokensForCrowdsale, tokenPrice);
        await conicoinToken.setCrowdsaleAddress(crowdsale.address);
        testToken = await TestToken.new(testTokenTotalSupply);
        insurance = await ConicoinInsurance.new(conicoinToken.address, tokenMultiplier, etherMultiplier);
		await conicoinToken.setInsuranceAddress(insurance.address);
	});

    describe('Deploy parametrs', function() {
        it("test token should have correct total supply", async function() {
            let _totalSupply = await testToken.totalSupply();
            assert.equal(_totalSupply, testTokenTotalSupply);
        });
    });

    describe('Adding partner', function() {

		it("test alowance", async function() {
			await testToken.transfer(insurance.address, 1000);
            let balanceUpdated = await testToken.balanceOf(insurance.address);
            assert.equal(balanceUpdated, 1000);
		});

        it("test adding partner", async function() {
            let _deadline = Date.now() + 100;

			// Check requirements / trying to add without alowance
            await expectThrow(insurance.addPartner(testToken.address, owner, 1, 0, _deadline, assets));
            await expectThrow(insurance.addPartner(testToken.address, owner, 1, 1000, _deadline, assets));

			await testToken.transfer(insurance.address, 1000);

			// Add Partner

			/* Start of GasLimit measurement */
            let addPartner = await insurance.addPartner(testToken.address, owner, 1, 1000, _deadline, assets);
			console.log("addPartner(Address,Address,Address,Number,Number,Number) GasLimit: " + addPartner.receipt.gasUsed);
			/* End of GasLimit measurement */

            let partner = await insurance.getPartner(testToken.address);
            assert.equal(partner[0], owner);
            assert.equal(partner[1], 1);
            assert.equal(partner[2], _deadline);
			assert.equal(partner[3], 1000);
			assert.equal(partner[4], 0);
			assert.equal(partner[5], assets);

			let partners = await insurance.getPartners();
			assert.equal(partners.length, 1);

			// Delete Partner

			/* Start of GasLimit measurement */
			let deletePartner = await insurance.deletePartner(partners[0]);
			console.log("deletePartner(Address) GasLimit: " + deletePartner.receipt.gasUsed);
			/* End of GasLimit measurement */

			partners = await insurance.getPartners();
			assert.equal(partners.length, 0);
        });

        it("test invest", async function() {
            let _approved = testTokenTotalSupply;
            let _investAmount = money(1);
            let _rate = 1e15;
			let _fee = _investAmount / etherMultiplier;
            let _tokenAmount = _investAmount/_rate;
			let _txValue = Number(_investAmount) + _fee
            let _deadline = Date.now() + 10;

			await testToken.transfer(insurance.address, _approved);
            await insurance.addPartner(testToken.address, owner, _rate, _approved, _deadline, assets);

			/* Start of GasLimit measurement */
            let invest = await insurance.investWithEthers(testToken.address, {from: acc1, value: _txValue})
			console.log("invest(Address) GasLimit: " + invest.receipt.gasUsed);
			/* End of GasLimit measurement */

            let invested = await insurance.getInvested(testToken.address, acc1);
            assert.equal(invested, _investAmount);
			assert.equal(invested, _tokenAmount * _rate);

			let insuranceBalance = await web3.eth.getBalance(insurance.address);
			assert.equal(insuranceBalance, _txValue);

			let partner = await insurance.getPartner(testToken.address);
			assert.equal(partner[3], _approved);
			assert.equal(partner[4], _investAmount);
        });

        it("test return investment", async function() {
			let _approved = testTokenTotalSupply;
            let _investAmount = money(1);
            let _rate = 1e15;
			let _fee = _investAmount / etherMultiplier;
            let _tokenAmount = _investAmount/_rate;
			let _txValue = Number(_investAmount) + _fee
            let _deadline = Date.now() + 10;

			await testToken.transfer(insurance.address, _approved);
            await insurance.addPartner(testToken.address, owner, _rate, _approved, _deadline, assets);
            await insurance.investWithEthers(testToken.address, {from: acc1, value: _txValue});

			/* Start of GasLimit measurement */
            let returnInvestment = await insurance.returnInvestment(testToken.address, {from: acc1});
			console.log("returnInvestment(Address) GasLimit: " + returnInvestment.receipt.gasUsed);
			/* End of GasLimit measurement */

            let insuranceBalance = await testToken.balanceOf(insurance.address);
            assert.equal(insuranceBalance, _approved);

			let insuranseEtherBalance = await web3.eth.getBalance(insurance.address);
			assert.equal(insuranseEtherBalance, _fee);

            let invested = await insurance.getInvested(testToken.address, acc1);
            assert.equal(invested, 0);

			let partner = await insurance.getPartner(testToken.address);
			assert.equal(partner[4], 0);
        });

		it("test confirm investment", async function() {
			let _approved = testTokenTotalSupply;
			let _investAmount = money(1);
			let _rate = 1e15;
			let _fee = _investAmount / etherMultiplier;
			let _tokenAmount = _investAmount/_rate;
			let _txValue = Number(_investAmount) + _fee
			let _deadline = Date.now() + 10;
			let _partnerEmptyWallet = "0x70f195Ab030D6ba891fcE33eff0938f8ad7F5171"; // random address

			let previousBalance = await web3.eth.getBalance(_partnerEmptyWallet);

			await testToken.transfer(insurance.address, _approved);
			await insurance.addPartner(testToken.address, _partnerEmptyWallet, _rate, _approved, _deadline, assets);
			await insurance.investWithEthers(testToken.address, {from: acc1, value: _txValue});

			/* Start of GasLimit measurement */
			let confirmInvestment = await insurance.confirmInvestment(testToken.address, {from: acc1});
			console.log("confirmInvestment(Address) GasLimit: " + confirmInvestment.receipt.gasUsed);
			/* End of GasLimit measurement */

			let testTokenAcc1Balance = await testToken.balanceOf(acc1);
            assert.equal(testTokenAcc1Balance, _tokenAmount);

			let partnerBalance = await web3.eth.getBalance(_partnerEmptyWallet);
			assert.equal(partnerBalance, Number(previousBalance) + Number(_investAmount));
		});

		it("test confirm finish offering", async function() {
			let _approved = testTokenTotalSupply;
            let _investAmount1 = money(1);
			let _investAmount2 = money(2);
			let _investAmount3 = money(3);
			let _rate = 1e15;
			let _tokenAmount1 = (Number(_investAmount1) + Number(_investAmount2)) / Number(_rate);
			let _tokenAmount2 = (Number(_investAmount3)) / Number(_rate);
			let _tokenAmountPartner = Number(testTokenTotalSupply) - Number(_tokenAmount1) - Number(_tokenAmount2);
			let _fee1 = _investAmount1 / etherMultiplier;
			let _fee2 = _investAmount2 / etherMultiplier;
			let _fee3 = _investAmount3 / etherMultiplier;
			let _txValue1 = Number(_investAmount1) + _fee1;
			let _txValue2 = Number(_investAmount2) + _fee2;
			let _txValue3 = Number(_investAmount3) + _fee3;
            let _deadline = (Date.now()/1000) + 5;

			let previousBalance = await web3.eth.getBalance(partnerAcc);

			await testToken.transfer(insurance.address, _approved);

            await insurance.addPartner(testToken.address, partnerAcc, _rate, _approved, _deadline, assets);

            await insurance.investWithEthers(testToken.address, {from: acc1, value: _txValue1});
			await insurance.investWithEthers(testToken.address, {from: acc1, value: _txValue2});
			await insurance.investWithEthers(testToken.address, {from: acc2, value: _txValue3});

			let partner = await insurance.getPartner(testToken.address);
			assert.equal(Number(partner[4]), Number(_investAmount1) + Number(_investAmount2) + Number(_investAmount3));

			await sleep(5000);

			/* Start of GasLimit measurement */
			let finishOffering = await insurance.finishOffering(testToken.address, {from: owner});
			console.log("finishOffering(Address) GasLimit: " + finishOffering.receipt.gasUsed);
			/* End of GasLimit measurement */

			await expectThrow(insurance.finishOffering(testToken.address, {from: owner}));

			let tokenBalance = await testToken.balanceOf(insurance.address);
			assert.equal(tokenBalance, 0);

			let tokenBalance1 = await testToken.balanceOf(acc1);
			assert.equal(tokenBalance1, _tokenAmount1);

			let tokenBalance2 = await testToken.balanceOf(acc2);
			assert.equal(tokenBalance2, _tokenAmount2);

			let tokenBalancePartner = await testToken.balanceOf(partnerAcc);
			assert.equal(tokenBalancePartner, _tokenAmountPartner);

			let partnerBalance = await web3.eth.getBalance(partnerAcc);
			assert.equal(Number(partnerBalance), Number(previousBalance) + Number(_investAmount1) + Number(_investAmount2) + Number(_investAmount3));

			let partners = await insurance.getPartners();
			assert.equal(partners.length, 0);
		});

		it("test finish offering without sending", async function() {
			let _approved = testTokenTotalSupply;
			let _investAmount1 = money(1);
			let _investAmount2 = money(2);
			let _investAmount3 = money(3);
			let _rate = 1e15;
			let _tokenAmount1 = (Number(_investAmount1) + Number(_investAmount2)) / Number(_rate);
			let _tokenAmount2 = (Number(_investAmount3)) / Number(_rate);
			let _tokenAmountPartner = Number(testTokenTotalSupply) - Number(_tokenAmount1) - Number(_tokenAmount2);
			let _fee1 = _investAmount1 / etherMultiplier;
			let _fee2 = _investAmount2 / etherMultiplier;
			let _fee3 = _investAmount3 / etherMultiplier;
			let _txValue1 = Number(_investAmount1) + _fee1;
			let _txValue2 = Number(_investAmount2) + _fee2;
			let _txValue3 = Number(_investAmount3) + _fee3;
			let _deadline = (Date.now()/1000) + 5;

			let previousBalance = await web3.eth.getBalance(partnerAcc);

			await testToken.transfer(insurance.address, _approved);

			await insurance.addPartner(testToken.address, partnerAcc, _rate, _approved, _deadline, assets);

			await insurance.investWithEthers(testToken.address, {from: acc1, value: _txValue1});
			await insurance.investWithEthers(testToken.address, {from: acc1, value: _txValue2});
			await insurance.investWithEthers(testToken.address, {from: acc2, value: _txValue3});

			let partner = await insurance.getPartner(testToken.address);
			assert.equal(Number(partner[4]), Number(_investAmount1) + Number(_investAmount2) + Number(_investAmount3));

			await sleep(5000);

			/* Start of GasLimit measurement */
			let finishOffering = await insurance.withdrawEarned(testToken.address, {from: owner});
			console.log("withdrawEarned(Address) GasLimit: " + finishOffering.receipt.gasUsed);
			/* End of GasLimit measurement */

			await expectThrow(insurance.withdrawEarned(testToken.address, {from: owner}));

			let tokenBalancePartner = await testToken.balanceOf(partnerAcc);
			assert.equal(tokenBalancePartner, _tokenAmountPartner);

			let partnerBalance = await web3.eth.getBalance(partnerAcc);
			assert.equal(Number(partnerBalance), Number(previousBalance) + Number(_investAmount1) + Number(_investAmount2) + Number(_investAmount3));

			let partners = await insurance.getPartners();
			assert.equal(partners.length, 1);

			await insurance.confirmInvestment(testToken.address, {from: acc1});
			await expectThrow(insurance.confirmInvestment(testToken.address, {from: acc1}));

			await insurance.confirmInvestment(testToken.address, {from: acc2});
			await expectThrow(insurance.confirmInvestment(testToken.address, {from: acc2}));

			let tokenBalance = await testToken.balanceOf(insurance.address);
			assert.equal(tokenBalance, 0);

			let tokenBalance1 = await testToken.balanceOf(acc1);
			assert.equal(tokenBalance1, _tokenAmount1);

			let tokenBalance2 = await testToken.balanceOf(acc2);
			assert.equal(tokenBalance2, _tokenAmount2);

			await insurance.deletePartner(testToken.address, {from: owner});

			partners = await insurance.getPartners();
			assert.equal(partners.length, 0);
		});

		// it("stress testing", async function() {
		// 	let _approved = testTokenTotalSupply;
		// 	let _rate = 1e15;
        //     let _deadline = (Date.now()/1000) + 100;
		//
		// 	console.log("123123")
		//
		// 	await testToken.transfer(insurance.address, _approved);
		//
		// 	console.log("321321")
		//
        //     await insurance.addPartner(testToken.address, partnerAcc, _rate, _approved, _deadline, assets);
		//
		// 	var i;
		// 	for(i = 5; i < 95; i++) {
		// 		await insurance.investWithEthers(testToken.address, {from: accounts[i], value: money(1)});
		// 		console.log("invested from: " + i)
        //     }
		//
		// 	await sleep(60000);
		//
		// 	/* Start of GasLimit measurement */
		// 	let finishOffering = await insurance.finishOffering(testToken.address, {from: owner});
		// 	console.log("finishOffering(Address) STRESS TEST GasLimit: " + finishOffering.receipt.gasUsed);
		// 	/* End of GasLimit measurement */
		// });
    });
});
