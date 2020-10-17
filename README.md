<p align="center">
    <img src="resources/blinkhash-logo-text3.png" height="110"></img>
</p>

---

## Introduction

This portal is an extremely efficient, highly scalable, all-in-one, easy to setup cryptocurrency mining pool written entirely in Node.JS. Its main features include a stratum poolserver and reward/payment/share processor. The website functionality has been removed as the Blinkhash Mining Pool uses a custom-built front-end design. If you want to access the Blinkhash Mining Pool, however, the website is available at https://blinkhash.com.

Documentation for the API is currently available at https://github.com/blinkhash/blinkhash-documentation. The API itself was specifically designed to be self-explanatory while still providing users with standardized JSON-formatted responses.

#### Need Support?

If you need help with an API or code-related matter, the first place to look is our [Discord](https://www.discord.gg/x2vgyZP), where I'll be available to answer any questions. However, please do not come to me with issues regarding how to clone/setup the server. Use Google for that.

---
## Configurations

Each of the configurations mentioned have been confirmed to work with the current release of the software. They've either been run in a closed environment on the coin's testnet or on the Blinkhash Mining Pool. The full repository of configurations is available at https://github.com/blinkhash/blinkhash-configurations. In order to use any of these configurations, download the .json file and place it in the "configs" folder. Make sure to look over the file thoroughly and change the addresses, ports, and fees as necessary.

* Bitcoin - [Mainnet](https://github.com/blinkhash/blinkhash-configurations/blob/master/configs/bitcoin-sha256d.json) / [Testnet](https://github.com/blinkhash/blinkhash-configurations/blob/master/configs/bitcoin-sha256d-testnet.json)
* Bitcoin Cash - [Mainnet](https://github.com/blinkhash/blinkhash-configurations/blob/master/configs/bitcoincash-sha256d.json) / [Testnet](https://github.com/blinkhash/blinkhash-configurations/blob/master/configs/bitcoincash-sha256d-testnet.json)
* Litecoin - [Mainnet](https://github.com/blinkhash/blinkhash-configurations/blob/master/configs/litecoin-scrypt.json) / [Testnet](https://github.com/blinkhash/blinkhash-configurations/blob/master/configs/litecoin-scrypt-testnet.json)
* Dash - [Mainnet](https://github.com/blinkhash/blinkhash-configurations/blob/master/configs/dash-x11.json) / [Testnet](https://github.com/blinkhash/blinkhash-configurations/blob/master/configs/dash-x11-testnet.json)

---

## Specifications

#### Features

* For the pool server it uses the [blinkhash-stratum-pool](https://github.com/blinkhash/blinkhash-stratum-pool) module which supports vardiff, POW & POS, transaction messages, anti-DDoS, IP banning, [several hashing algorithms](https://github.com/blinkhash/blinkhash-stratum-pool#hashing-algorithms-supported).
* Multipool ability - this software was built from the ground up to run with multiple coins simultaneously (which can have different properties and hashing algorithms). It can be used to create a pool for a single coin or for multiple coins at once. The pools use clustering to load balance across multiple CPU cores.
* For reward/payment processing, shares are inserted into Redis (a fast NoSQL key/value store). The PPLNT reward system is used with [Redis Transactions](http://redis.io/topics/transactions) for secure and super speedy payouts. There is zero risk to the pool operator. Shares from rounds resulting in orphaned blocks will be merged into share in the current round so that each and every share will be rewarded
* This portal does not have user accounts/logins/registrations. Instead, miners simply use their coin address for stratum authentication.

#### Security

* Without a registration/login system, non-security-oriented miners reusing passwords across pools is no longer a concern.
* Automated payouts by default and pool profits are sent to another address so pool wallets aren't plump with coins, giving hackers few rewards and keeping your pool from being a target.
* Miners can notice lack of automated payments as a possible early warning sign that an operator is about to run off with their coins.

#### Transparency

* The API was specifically designed to be as transparent as possible regarding payouts and shares. Everything is logged for users to check and ensure that everything is legitimate.
* The server itself will always be open-source. Feel free to create relevant issues and pull requests whenever necessary.

#### Attack Mitigation

* Detects and thwarts socket flooding (garbage data sent over socket in order to consume system resources).
* Detects and thwarts zombie miners (botnet infected computers connecting to your server to use up sockets but not sending any shares).
* Detects and thwarts invalid share attacks:
   * This server is not vulnerable to the low difficulty share exploits happening to other pool servers. Rather than using hardcoded max difficulties for new hashing algorithms, it dynamically generates the max difficulty for each algorithm based on values found in the coin source code.
   * IP banning feature which on a configurable threshold will ban an IP for a configurable amount of time if the miner submits over a configurable threshold of invalid shares.
* The server is written in Node.js which uses a single thread (async) to handle connections rather than the overhead of one thread per connection. Clustering is also implemented so that all CPU cores are taken advantage of.

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
