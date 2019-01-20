require('babel-register');
require('babel-polyfill');

var HDWalletProvider = require('truffle-hdwallet-provider');
var mnemonic = "";

module.exports = {
    olc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    networks: {
        dev: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
            gas: 4712388
        },
        ganache: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
            gas: 6000000
        },
        // rinkeby: {
        //     host: "localhost",
        //     port: 8545,
        //     network_id: 4,
        //     from: "0xcc936eb4fc467f6b4d48da58fb05afcfbecbcee2",
        //     gas: 7712390
        // }
        rinkeby: {
            provider: function() {
                return new HDWalletProvider(mnemonic,"https://rinkeby.infura.io/");
            },
            network_id: 4
        }
    }
};
