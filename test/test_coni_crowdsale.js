'use strict';

import expectThrow from './helpers/expectThrow';

const ConicoinToken = artifacts.require('ConicoinToken');
const ConicoinCrowdsale = artifacts.require('ConicoinCrowdsale')

let denominationUnit = "ether";
function money(number) {
	return web3.toWei(number, denominationUnit);
}

/// ConicoinCrowdsale Init params
let tokensForCrowdsale = 20000000; // 20 000 000
let tokenPrice = 5e15; // 0.005 Eth

/// ConicoinToken Init params
let tokenLimit = 2**29; // 536,870,912

contract('Token', function(accounts) {

    /// @dev ganache accounts
    let owner = accounts[0];
    let acc1 = accounts[1];
    let acc2 = accounts[2];
    let acc3 = accounts[3];
	let team = accounts[99];

    /// @dev instances of contracts
    let conicoinToken;
    let crowdsale;

    /// @dev runs before each "it" function
    beforeEach(async function () {
		conicoinToken = await ConicoinToken.new(tokenLimit);
		crowdsale = await ConicoinCrowdsale.new(conicoinToken.address, team, tokensForCrowdsale, tokenPrice);
		await conicoinToken.setCrowdsaleAddress(crowdsale.address);
	});

    describe('Deploy parametrs', function() {
		it("should set crowdsale only owner", async function() {
			await conicoinToken.setCrowdsaleAddress(conicoinToken.address, {from: owner});
			await expectThrow(conicoinToken.setCrowdsaleAddress(conicoinToken.address, {from: acc1}));
		})
    });

	describe('Prevent external minting', function() {
		it("should return on minting from not crowdsale", async function() {
			await expectThrow(conicoinToken.mint(owner, money(1)));
		});
	});

	describe('Setting team correctly', function() {
		it("should set team address", async function() {
		 	let settedTeam = await crowdsale.getTeam();
			assert.equal(settedTeam, team);
		});

		it("only owner should change team address", async function() {
		 	await crowdsale.changeTeamAddress(acc1, {from: owner});
			let newTeam = await crowdsale.getTeam();
			assert.equal(acc1, newTeam);
		});
	});

	describe('Crowdsale limits', function() {
		it("should prevent limit overflow", async function() {
			await crowdsale.buyFor(acc1, {from: acc1, value: tokenPrice * tokensForCrowdsale});
			await expectThrow(crowdsale.buyFor(acc1, {from: acc1, value: tokenPrice}));
		});
	});

	describe('Buy tokens', function() {
		it("should buy tokens", async function() {
		 	await crowdsale.buyFor(acc1, {from: acc1, value: tokenPrice * 100});
			let balanceAcc1 = await conicoinToken.balanceOf(acc1);
			assert.equal(balanceAcc1, 100);
		});

		it("should finish minting", async function() {
			await crowdsale.buyFor(acc1, {from: acc1, value: tokenPrice * 100});
			await expectThrow(conicoinToken.finishMinting({from: acc1}));
			await conicoinToken.finishMinting({from: owner});
			let balanceOwner = await conicoinToken.balanceOf(owner);
			assert.equal(balanceOwner, tokenLimit-100);

			await expectThrow(crowdsale.buyFor(acc1, {from: acc1, value: tokenPrice * 100}));
			await expectThrow(crowdsale.buyFor(acc1, {from: owner, value: tokenPrice * 100}));
			await expectThrow(conicoinToken.mint(owner, tokenPrice * 100));
		});

		it("should change token price", async function() {
			let newTokenPrice = 1e17;
			await crowdsale.changeTokenPrice(newTokenPrice);
			await crowdsale.buyFor(acc2, {from: acc2, value: newTokenPrice * 100});
			let balanceAcc2 = await conicoinToken.balanceOf(acc2);
			assert.equal(balanceAcc2, 100);
		});
	});

});
