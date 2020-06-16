Blinkhash Stratum Pool
-------

This portal is an extremely efficient, highly scalable, all-in-one, easy to setup cryptocurrency mining pool written entirely in Node.js. Its main features include a stratum poolserver and reward/payment/share processor. The website functionality has been removed as the Blinkhash Mining Pool uses a custom-built front-end design

#### Table of Contents
* [Features](#features)
  * [Attack Mitigation](#attack-mitigation)
  * [Security](#security)
* [Usage](#usage)
  * [Requirements](#requirements)
  * [Setting Up Coin Daemon](#0-setting-up-coin-daemon)
  * [Downloading & Installing](#1-downloading--installing)
  * [Configuration](#2-configuration)
    * [Portal Configuration](#portal-configuration)
    * [Coin Configuration](#coin-configuration)
    * [Pool Configuration](#pool-configuration)
  * [Starting the Portal](#3-start-the-portal)
* [Credits](#credits)
* [License](#license)

### Features

* For the pool server it uses the [blinkhash-stratum-pool](https://github.com/blinkhash/blinkhash-stratum-pool) module which supports vardiff, POW & POS, transaction messages, anti-DDoS, IP banning, [several hashing algorithms](https://github.com/blinkhash/blinkhash-stratum-pool#hashing-algorithms-supported).

* Multi-pool ability - this software was built from the ground up to run with multiple coins simultaneously (which can have different properties and hashing algorithms). It can be used to create a pool for a single coin or for multiple coins at once. The pools use clustering to load balance across multiple CPU cores.

* For reward/payment processing, shares are inserted into Redis (a fast NoSQL key/value store). The PROP (proportional) reward system is used with [Redis Transactions](http://redis.io/topics/transactions) for secure and super speedy payouts. There is zero risk to the pool operator. Shares from rounds resulting in orphaned blocks will be merged into share in the current round so that each and every share will be rewarded

* This portal does not have user accounts/logins/registrations. Instead, miners simply use their coin address for stratum authentication.

#### Attack Mitigation
* Detects and thwarts socket flooding (garbage data sent over socket in order to consume system resources).
* Detects and thwarts zombie miners (botnet infected computers connecting to your server to use up sockets but not sending any shares).
* Detects and thwarts invalid share attacks:
   * This server is not vulnerable to the low difficulty share exploits happening to other pool servers. Rather than using hardcoded max difficulties for new hashing algorithms, it dynamically generates the max difficulty for each algorithm based on values found in the coin source code.
   * IP banning feature which on a configurable threshold will ban an IP for a configurable amount of time if the miner submits over a configurable threshold of invalid shares.
* The server is written in Node.js which uses a single thread (async) to handle connections rather than the overhead of one thread per connection. Clustering is also implemented so that all CPU cores are taken advantage of.

#### Security
The server has some implicit security advantages for pool operators and miners:
* Without a registration/login system, non-security-oriented miners reusing passwords across pools is no longer a concern.
* Automated payouts by default and pool profits are sent to another address so pool wallets aren't plump with coins, giving hackers few rewards and keeping your pool from being a target.
* Miners can notice lack of automated payments as a possible early warning sign that an operator is about to run off with their coins.

Usage
-------

#### Requirements
* Coin daemon(s) (find the coin's repo and build latest version from source)
* [Node.js](http://nodejs.org/) v0.10+ ([follow these installation instructions](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager))
* [Redis](http://redis.io/) key-value store v2.6+ ([follow these instructions](http://redis.io/topics/quickstart))

##### Seriously
Those are legitimate requirements. If you use old versions of Node.js or Redis that may come with your system package manager then you will have problems. Follow the linked instructions to get the last stable versions.

[**Redis security warning**](http://redis.io/topics/security): be sure firewall access to redis - an easy way is to include `bind 127.0.0.1` in your `redis.conf` file. Also it's a good idea to learn about and understand software that you are using - a good place to start with redis is [data persistence](http://redis.io/topics/persistence).

#### 0) Setting up Coin Daemon
Follow the build/install instructions for your coin daemon. Your coin.conf file should end up looking something like this:

```
daemon=1
rpcuser=litecoinrpc
rpcpassword=securepassword
rpcport=19332
```

For redundancy, its recommended to have at least two daemon instances running in case one drops out-of-sync or offline, all instances will be polled for block/transaction updates and be used for submitting blocks. Creating a backup daemon involves spawning a daemon using the `-datadir=/backup` command-line argument which creates a new daemon instance with it's own config directory and coin.conf file. Learn about the daemon, how to use it and how it works if you want to be
a good pool operator. For starters be sure to read:
   * https://en.bitcoin.it/wiki/Running_bitcoind
   * https://en.bitcoin.it/wiki/Data_directory
   * https://en.bitcoin.it/wiki/Original_Bitcoin_client/API_Calls_list
   * https://en.bitcoin.it/wiki/Difficulty

#### 1) Downloading & Installing

Clone the repository and run `npm update` for all the dependencies to be installed:

```bash
git clone https://github.com/blinkhash/blinkhash-server blinkhash-server
cd blinkhash-server
npm update
```

#### 2) Configuration

##### Portal Configuration
Inside the `config_example.json` file, ensure the default configuration will work for your environment, then copy the file to `config.json`.

Explanation for each field:

````
{
    /* Specifies the level of log output verbosity. Anything more severe than the level specified
       will also be logged. */
    "logLevel": "debug", //or "warning", "error"

    /* By default NOMP logs to console and gives pretty colors. If you direct that output to a
       log file then disable this feature to avoid nasty characters in your log file. */
    "logColors": true,


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

    /* Pool config file will inherit these default values if they are not set. */
    "defaultPoolConfigs": {

        /* Poll RPC daemons for new blocks every this many milliseconds. */
        "blockRefreshInterval": 1000,

        /* If no new blocks are available for this many seconds update and rebroadcast job. */
        "jobRebroadcastTimeout": 55,

        /* Disconnect workers that haven't submitted shares for this many seconds. */
        "connectionTimeout": 600,

        /* (For MPOS mode) Store the block hashes for shares that aren't block candidates. */
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
            "time": 600, //How many seconds to ban worker for
            "invalidPercent": 50, //What percent of invalid shares triggers ban
            "checkThreshold": 500, //Perform check when this many shares have been submitted
            "purgeInterval": 300 //Every this many seconds clear out the list of old bans
        },

        /* Used for storing share and block submission data and payment processing. */
        "redis": {
            "host": "127.0.0.1",
            "port": 6379
        }
    },

    /* Redis instance of where to store global portal data such as historical stats, proxy states,
       ect.. */
    "redis": {
        "host": "127.0.0.1",
        "port": 6379
    },

    "stats": {
        /* Gather stats to broadcast to page viewers and store in redis for historical stats
           every this many seconds. */
        "updateInterval": 15,
        /* How many seconds to hold onto historical stats. Currently set to 24 hours. */
        "historicalRetention": 43200,
        /* How many seconds worth of shares should be gathered to generate hashrate. */
        "hashrateWindow": 300
    },
}
````

##### Coin Configuration
Inside the `coins` directory, ensure a json file exists for your coin. If it does not you will have to create it. Here is an example of the required fields:

````
{
    "name": "Blinkhash",
    "symbol": "ltc",
    "algorithm": "scrypt",

    /* Magic value only required for setting up p2p block notifications. It is found in the daemon
       source code as the pchMessageStart variable.
       For example, litecoin mainnet magic: http://git.io/Bi8YFw
       And for litecoin testnet magic: http://git.io/NXBYJA */
    "peerMagic": "fbc0b6db", //optional
    "peerMagicTestnet": "fcc1b7dc" //optional

    //"txMessages": false, //options - defaults to false

    //"mposDiffMultiplier": 256, //options - only for x11 coins in mpos mode
}
````

For additional documentation how to configure coins and their different algorithms
see [these instructions](https://github.com/blinkhash/blinkhash-stratum-pool#module-usage).

##### Pool Configuration
Take a look at the example json file inside the `pool_configs` directory. Rename it to `yourcoin.json` and change the example fields to fit your setup.

Description of options:

````
{
    "enabled": true, //Set this to false and a pool will not be created from this config file
    "coin": "litecoin.json", //Reference to coin config file in 'coins' directory

    "address": "mi4iBXbBsydtcc5yFmsff2zCFVX4XG7qJc", //Address to where block rewards are given

    /* Block rewards go to the configured pool wallet address to later be paid out to miners,
       except for a percentage that can go to, for examples, pool operator(s) as pool fees or
       or to donations address. Addresses or hashed public keys can be used. Here is an example
       of rewards going to the main pool op, a pool co-owner, and NOMP donation. */
    "rewardRecipients": {
        "n37vuNFkXfk15uFnGoVyHZ6PYQxppD3QqK": 1.5, //1.5% goes to pool op
        "mirj3LtZxbSTharhtXvotqtJXUY7ki5qfx": 0.5, //0.5% goes to a pool co-owner

        /* 0.1% donation to NOMP. This pubkey can accept any type of coin, please leave this in
           your config to help support NOMP development. */
        "22851477d63a085dbc2398c8430af1c09e7343f6": 0.1
    },

    "paymentProcessing": {
        "enabled": true,

        /* Every this many seconds get submitted blocks from redis, use daemon RPC to check
           their confirmation status, if confirmed then get shares from redis that contributed
           to block and send out payments. */
        "paymentInterval": 1200,

        /* Every this many seconds perform checks and update specific fields in API, such as
           balances and the like */
        "checkInterval": 60,

        /* Minimum number of coins that a miner must earn before sending payment. Typically,
           a higher minimum means less transactions fees (you profit more) but miners see
           payments less frequently (they dislike). Opposite for a lower minimum payment. */
        "minimumPayment": 0.01,

        /* This daemon is used to send out payments. It MUST be for the daemon that owns the
           configured 'address' that receives the block rewards, otherwise the daemon will not
           be able to confirm blocks or send out payments. */
        "daemon": {
            "host": "127.0.0.1",
            "port": 19332,
            "user": "testuser",
            "password": "testpass"
        }
    },

    /* Each pool can have as many ports for your miners to connect to as you wish. Each port can
       be configured to use its own pool difficulty and variable difficulty settings. varDiff is
       optional and will only be used for the ports you configure it for. */
    "ports": {
        "3032": { //A port for your miners to connect to
            "enabled": true, //the desired state of the port
            "enableSoloMining": false, //solo vs shared mining on this port
            "diff": 32, //the pool difficulty for this port

            /* Variable difficulty is a feature that will automatically adjust difficulty for
               individual miners based on their hashrate in order to lower networking overhead */
            "varDiff": {
                "minDiff": 8, //Minimum difficulty
                "maxDiff": 512, //Network difficulty will be used if it is lower than this
                "targetTime": 15, //Try to get 1 share per this many seconds
                "retargetTime": 90, //Check to see if we should retarget every this many seconds
                "variancePercent": 30 //Allow time to very this % from target without retargeting
            }
        },
        "3256": { //Another port for your miners to connect to, this port does not use varDiff
            "enabled": true, //the desired state of the port
            "enableSoloMining": false, //solo vs shared mining on this port
            "diff": 256 //The pool difficulty
        }
    },

    /* More than one daemon instances can be setup in case one drops out-of-sync or dies. */
    "daemons": [
        {   //Main daemon instance
            "host": "127.0.0.1",
            "port": 19332,
            "user": "testuser",
            "password": "testpass"
        }
    ],

    /* This allows the pool to connect to the daemon as a node peer to receive block updates.
       It may be the most efficient way to get block updates (faster than polling, less
       intensive than blocknotify script). It requires the additional field "peerMagic" in
       the coin config. */
    "p2p": {
        "enabled": false,

        /* Host for daemon */
        "host": "127.0.0.1",

        /* Port configured for daemon (this is the actual peer port not RPC port) */
        "port": 19333,

        /* If your coin daemon is new enough (i.e. not a shitcoin) then it will support a p2p
           feature that prevents the daemon from spamming our peer node with unnecessary
           transaction data. Assume its supported but if you have problems try disabling it. */
        "disableTransactions": true
    },
}

````

You can create as many of these pool config files as you want (such as one pool per coin you which to operate). If you are creating multiple pools, ensure that they have unique stratum ports. For more information on these configuration options see the [pool module documentation](https://github.com/blinkhash/blinkhash-stratum-pool#module-usage)

#### 3) Start the portal

```
node init.js
```

Credits
-------
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


License
-------
Released under the GNU General Public License v2

http://www.gnu.org/licenses/gpl-2.0.html
