<p align="center">
    <img src="resources/blinkhash-logo-text3.png" height="110"></img>
</p>

---

## Introduction

This portal is an extremely efficient, highly scalable, all-in-one, easy to setup cryptocurrency mining pool written entirely in Node.JS. Its main features include a stratum poolserver and reward/payment/share processor. The website functionality has been removed as the Blinkhash Mining Pool uses a custom-built front-end design. If you want to access the Blinkhash Mining Pool, however, the website is available at https://blinkhash.com.

Documentation for the API is currently available at https://github.com/blinkhash/blinkhash-documentation. The API itself was specifically designed to be self-explanatory while still providing users with standardized JSON-formatted responses.

### Need Support?

If you need help with an API or code-related matter, the first place to look is our [Discord](https://www.discord.gg/x2vgyZP), where I'll be available to answer any questions. However, please do not come to me with issues regarding how to clone/setup the server. Use Google for that.

---

## Specifications

### Features

* For the pool server it uses the [blinkhash-stratum-pool](https://github.com/blinkhash/blinkhash-stratum-pool) module which supports vardiff, POW & POS, transaction messages, anti-DDoS, IP banning, [several hashing algorithms](https://github.com/blinkhash/blinkhash-stratum-pool#hashing-algorithms-supported).
* Multipool ability - this software was built from the ground up to run with multiple coins simultaneously (which can have different properties and hashing algorithms). It can be used to create a pool for a single coin or for multiple coins at once. The pools use clustering to load balance across multiple CPU cores.
* For reward/payment processing, shares are inserted into Redis (a fast NoSQL key/value store). The PPLNT reward system is used with [Redis Transactions](http://redis.io/topics/transactions) for secure and super speedy payouts. There is zero risk to the pool operator. Shares from rounds resulting in orphaned blocks will be merged into share in the current round so that each and every share will be rewarded
* This portal does not have user accounts/logins/registrations. Instead, miners simply use their coin address for stratum authentication.

### Attack Mitigation

* Detects and thwarts socket flooding (garbage data sent over socket in order to consume system resources).
* Detects and thwarts zombie miners (botnet infected computers connecting to your server to use up sockets but not sending any shares).
* Detects and thwarts invalid share attacks:
   * This server is not vulnerable to the low difficulty share exploits happening to other pool servers. Rather than using hardcoded max difficulties for new hashing algorithms, it dynamically generates the max difficulty for each algorithm based on values found in the coin source code.
   * IP banning feature which on a configurable threshold will ban an IP for a configurable amount of time if the miner submits over a configurable threshold of invalid shares.
* The server is written in Node.js which uses a single thread (async) to handle connections rather than the overhead of one thread per connection. Clustering is also implemented so that all CPU cores are taken advantage of.

### Security

* Without a registration/login system, non-security-oriented miners reusing passwords across pools is no longer a concern.
* Automated payouts by default and pool profits are sent to another address so pool wallets aren't plump with coins, giving hackers few rewards and keeping your pool from being a target.
* Miners can notice lack of automated payments as a possible early warning sign that an operator is about to run off with their coins.

### Transparency

* The API was specifically designed to be as transparent as possible regarding payouts and shares. Everything is logged for users to check and ensure that everything is legitimate.
* The server itself will always be open-source. Feel free to create relevant issues and pull requests whenever necessary.

---

## Setup

### Requirements

* Coin daemon(s) (Find the coin's repository and build the latest version from source)
* [Node.js](http://nodejs.org/) v12.0+ (Tested with v12.16.1) ([Instructions](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager))
* [Redis](http://redis.io/) key-value store v2.6+ (Tested with v5.0.7) ([Instructions](http://redis.io/topics/quickstart))

Note: Those are legitimate requirements. If you use old versions of Node.js or Redis that may come with your system package manager then you will have problems. Follow the linked instructions to get the last stable versions.

Beyond this, make sure to give Redis firewall access - an easy way is to include `bind 127.0.0.1` in your `redis.conf` file. Also, it's a good idea to learn about and understand all aspects of the software that you are using. A good place to start with Redis is [data persistence](http://redis.io/topics/persistence).

#### 1) Setting up Coin Daemon

Follow the build/install instructions for your coin daemon. Your coin.conf file should end up looking something like this:

```
daemon=1
rpcuser=blinkhash
rpcpassword=blinkhash
rpcport=26710
```

For redundancy, it's recommended to have at least two daemon instances running in case one drops out-of-sync or offline. All instances listed will be polled for block/transaction updates and be used for submitting blocks. Creating a backup daemon involves spawning a daemon using the `-datadir=/backup` command-line argument which creates a new daemon instance with it's own config directory and coin.conf file. Learn about the daemon, how to use it and how it works if you want to be a good pool operator. For starters, be sure to read:
   * https://en.bitcoin.it/wiki/Running_bitcoind
   * https://en.bitcoin.it/wiki/Data_directory
   * https://en.bitcoin.it/wiki/Original_Bitcoin_client/API_Calls_list
   * https://en.bitcoin.it/wiki/Difficulty

#### 2) Downloading & Installing

Clone the repository and run `npm update` for all the dependencies to be installed:

```bash
git clone https://github.com/blinkhash/blinkhash-server blinkhash-server
cd blinkhash-server
npm update
```

#### 3) Configuration

Rename the `example.json` file to `config.json`. Inside it, ensure that the default configuration will work for your environment before starting the pool.

````
{
    /* The NOMP CLI (command-line interface) will listen for commands on this port. For example,
       blocknotify messages are sent to NOMP through this. */
    "cliPort": 17117,

    /* By default 'forks' is set to "auto" which will spawn one process/fork/worker for each CPU
       core in your system. Each of these workers will run a separate instance of your pool(s),
       and the kernel will load balance miners using these forks. Optionally, the 'forks' field
       can be a number for how many forks will be spawned. */
    "clustering": {
        "enabled": true,
        "forks": "auto"
    },

    /* By default NOMP logs to console and gives pretty colors. If you direct that output to a
       log file then disable this feature to avoid nasty characters in your log file. */
    "logColors": true,
    /* Specifies the level of log output verbosity. Anything more severe than the level specified
       will also be logged. */
    "logLevel": "debug", // or "warning", "error"

    /* Pool config file will inherit these default values if they are not set. */
    "defaultPoolConfigs": {
        /* Poll RPC daemons for new blocks every this many milliseconds. */
        "blockRefreshInterval": 1000,
        /* If no new blocks are available for this many seconds update and rebroadcast job. */
        "jobRebroadcastTimeout": 55,
        /* Disconnect workers that haven't submitted shares for this many seconds. */
        "connectionTimeout": 600,
        /* Store the block hashes for shares that aren't block candidates. */
        "emitInvalidBlockHashes": false,
        /* This option will only authenticate miners using an address or mining key. */
        "validateWorkerUsername": true,
        /* Enable for client IP addresses to be detected when using a load balancer with TCP
           proxy protocol enabled, such as HAProxy with 'send-proxy' param:
           http://haproxy.1wt.eu/download/1.5/doc/configuration.txt */
        "tcpProxyProtocol": false,
        /* If under low-diff share attack we can ban their IP to reduce system/network load. If
           running behind HAProxy be sure to enable 'tcpProxyProtocol', otherwise you'll end up
           banning your own IP address (and therefore all workers). */
        "banning": {
            "enabled": true,
            "time": 600, // How many seconds to ban worker for
            "invalidPercent": 50, // What percent of invalid shares triggers ban
            "checkThreshold": 500, // Perform check when this many shares have been submitted
            "purgeInterval": 300 // Every this many seconds clear out the list of old bans
        },
    },

    /* Redis instance of where to store global data, */
    "redis": {
        "host": "127.0.0.1",
        "port": 6379,
        "password": ""
        "cluster": false,
    },

    /* The host/port of where to run the server */
    "server": {
        "host": "127.0.0.1",
        "port": 3001
    },

    /* Settings for statistics gathering
    "stats": {
        /* Interval to update API/statistics data. Currently set to 1 minute. */
        "updateInterval": 60,
        /* Interval to calculate and gather historical stats. Currently set to 10 minutes. */
        "historicalInterval": 600,
        /* How many seconds to hold onto historical stats. Currently set to 24 hours. */
        "historicalRetention": 43200,
        /* How many seconds worth of shares should be gathered to generate hashrate. */
        "hashrateWindow": 300    
    }

}
````

In order to create a new pool, take a look at the `example.json` file inside the `configs` directory for guidance. Create another file that relates to your coin/pool in the same folder. For additional documentation how to configure coins and their different algorithms see [these instructions](https://github.com/blinkhash/blinkhash-stratum-pool#module-usage).

````
{
    "enabled": true, // Set this to false and a pool will not be created from this config file
    "featured": false, // Whether or not you want the pool to have a 'featured' tag
    "fees": 1, // % Fees for block rewards for easy statistics gathering

    /* Addresses for the pool to use for payments */
    "addresses": {
        "address": "MMvdRHMDh128QgG2GebQhiUmiV8GCiiB5G",
        "tAddress": "",
        "zAddress": ""
    },

    /* Specifications for the current coin */
    "coin": {
        "name": "Blinkhash", // Coin name
        "symbol": "BHTC", // Coin symbol
        "algorithm": "scrypt", // Coin algorithm
        "peerMagic": "ace4b9cd", // Coin peer magic (pchMessageStart in src/chainparameters.cpp)
        "peerMagicTestnet": "f01a6eef", // Coin peer magic (pchMessageStart in src/chainparameters.cpp)
        "hashrateType": "sols", // Type of hashrate supported by coin ('hashes', 'sols')
        "requireShielding": false, // Whether the coin requires shielding
        "sapling": false, // Whether the coin supports the sapling protocol
        "txfee": 0.0004, // The default txfee to use when sending transactions
        /* Add mainnet parameters here. Just like with peerMagic/peerMagicTestnet, you can find most of
           the required values in src/chainparameters.cpp. If your coin does not possess these values, you
           can remove the information from the configuration file. */
        "mainnet": {
            "bech32": "bhtc",
            "bip32": {
                "public": "0488B21E"
            },
            "pubKeyHash": "19",
            "scriptHash": "32"
        },
        /* Add equihash parameters here, depending on the configuration of the algorithm used */
        "parameters": {
            "N": "",
            "K": "",
            "personalization": ""
        },
        /* Add testnet parameters here. Just like with peerMagic/peerMagicTestnet, you can find most of
           the required values in src/chainparameters.cpp. If your coin does not possess these values, you
           can remove the information from the configuration file. */
        "testnet": {
            "bech32": "tbhtc",
            "bip32": {
                "public": "043587CF"
            },
            "pubKeyHash": "19",
            "scriptHash": "C4"
        }
    }

    /* More than one daemon instances can be setup in case one drops out-of-sync or dies. */
    "daemons": [
        {
            "host": "127.0.0.1",
            "port": 26710,
            "user": "blinkhash",
            "password": "blinkhash"
        }
    ],

    /* Functionality to handle payment processing throughout the pool */
    "paymentProcessing": {
        "enabled": true,
        /* Every this many seconds perform checks and update specific fields in API, such
            as balances and the like */
        "checkInterval": 20,
        /* Every this many seconds (disabled if == 0) perform checks on the status of the
           shielding processes for coins that support it (zcash, zclassic, etc) */
        "operationInterval": 0,
        /* Every this many seconds get submitted blocks from redis, use daemon RPC to check
           their confirmation status, if confirmed then get shares from redis that contributed
           to block and send out payments. */
       "paymentInterval": 7200,
        /* Every this many seconds (disabled if == 0) run a shielding process for coins that
           support it (zcash, zclassic, etc.) */
       "shieldInterval": 0,
        /* Minimum number of coins that a miner must earn before sending payment. Typically,
           a higher minimum means less transactions fees (you profit more) but miners see
           payments less frequently (they dislike). Opposite for a lower minimum payment. */
        "minimumPayment": 0.05,
        /* This daemon is used to send out payments. It MUST be for the daemon that owns the
           configured 'address' that receives the block rewards, otherwise the daemon will not
           be able to confirm blocks or send out payments. */
        "daemon": {
            "host": "127.0.0.1",
            "port": 26710,
            "user": "blinkhash",
            "password": "blinkhash"
        }
    },

    /* Each pool can have as many ports for your miners to connect to as you wish. Each port can
       be configured to use its own pool difficulty and variable difficulty settings. varDiff is
       optional and will only be used for the ports you configure it for. */
    "ports": {
        "3032": { // A port for your miners to connect to
            "enabled": true, // The desired state of the port
            "soloMining": false, // Solo vs shared mining on this port
            "diff": 32, // The pool difficulty for this port
            /* Variable difficulty is a feature that will automatically adjust difficulty for
               individual miners based on their hashrate in order to lower networking overhead */
            "varDiff": {
                "minDiff": 8, // Minimum difficulty
                "maxDiff": 512, // Network difficulty will be used if it is lower than this
                "targetTime": 15, // Try to get 1 share per this many seconds
                "retargetTime": 90, // Check to see if we should retarget every this many seconds
                "variancePercent": 30 // Allow time to very this % from target without retargeting
            }
        },
        "3256": { // Another port for your miners to connect to, this port does not use varDiff
            "enabled": true, // The desired state of the port
            "soloMining": false, // Solo vs shared mining on this port
            "diff": 256 // The pool difficulty
        }
    },

    /* This allows the pool to connect to the daemon as a node peer to receive block updates.
       It may be the most efficient way to get block updates (faster than polling, less
       intensive than blocknotify script). It requires the additional field "peerMagic" in
       the coin config. */
    "p2p": {
        "enabled": false,
        /* Host for daemon */
        "host": "127.0.0.1",
        /* Port configured for daemon (this is the actual peer port not RPC port) */
        "port": 26709,
        /* If your coin daemon is new enough (i.e. not a shitcoin) then it will support a p2p
           feature that prevents the daemon from spamming our peer node with unnecessary
           transaction data. Assume its supported but if you have problems try disabling it. */
        "disableTransactions": true
    },

    /* Block rewards go to the configured pool wallet address to later be paid out to miners,
       except for a percentage that can go to, for examples, pool operator(s) as pool fees or
       or to donations address. Addresses or hashed public keys can be used. Here is an example
       of rewards going to the main pool op, a pool co-owner, and NOMP donation. */
    "rewardRecipients": {
        "M8ucqBhn5zfwYiCG6W1KoHZ9buymbedFov": 1.5,
    },
}
````

You can create as many of these pool files as you want. If you are creating multiple pools, ensure that they have unique stratum ports. For more information on these configuration options, see the [pool module documentation](https://github.com/blinkhash/blinkhash-stratum-pool#module-usage).

#### 4) Starting the Pool

In order to start the pool, simply run the following line of code.

```
npm run start
```

---

## Credits

#### Blinkhash
* [Nick Sarris / Blinkhash](https://github.com/blinkhash) - developer behind Blinkhash updates

#### S-NOMP
* [egyptianbman](https://github.com/egyptianbman) - developer behind S-NOMP updates
* [nettts](https://github.com/nettts) - developer behind S-NOMP updates
* [potato](https://github.com/zzzpotato) - developer behind S-NOMP updates

#### Z-NOMP
* [Joshua Yabut / movrcx](https://github.com/joshuayabut) - developer behind Z-NOMP updates
* [Aayan L / anarch3](https://github.com/aayanl) - developer behind Z-NOMP updates
* [hellcatz](https://github.com/hellcatz) - developer behind Z-NOMP updates

#### NOMP
* [Matthew Little / zone117x](https://github.com/zone117x) - developer behind NOMP updates
* [Jerry Brady / mintyfresh68](https://github.com/bluecircle) - got coin-switching fully working and developed proxy-per-algo feature
* [Tony Dobbs](http://anthonydobbs.com) - designs for front-end and created the NOMP logo
* [LucasJones](//github.com/LucasJones) - got p2p block notify working and implemented additional hashing algos
* [vekexasia](//github.com/vekexasia) - co-developer & great tester
* [TheSeven](//github.com/TheSeven) - answering an absurd amount of my questions and being a very helpful gentleman
* [UdjinM6](//github.com/UdjinM6) - helped implement fee withdrawal in payment processing
* [Alex Petrov / sysmanalex](https://github.com/sysmanalex) - contributed the pure C block notify script
* [svirusxxx](//github.com/svirusxxx) - sponsored development of MPOS mode
* [icecube45](//github.com/icecube45) - helping out with the repo wiki
* [Fcases](//github.com/Fcases) - ordered me a pizza <3
* Those that contributed to [node-stratum-pool](//github.com/zone117x/node-stratum-pool#credits)

---

## License

Released under the GNU General Public License v2
http://www.gnu.org/licenses/gpl-2.0.html
