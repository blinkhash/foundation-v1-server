# Foundation Server

[![Codecov Coverage](https://img.shields.io/codecov/c/github/blinkhash/foundation-server.svg?style=flat-square)](https://codecov.io/gh/blinkhash/foundation-server/)
[![Foundation CI](https://github.com/blinkhash/foundation-server/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/blinkhash/foundation-server/actions/workflows/build.yml)
[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)
[![Downloads](https://img.shields.io/npm/dm/foundation-server.svg)](https://www.npmjs.com/package/foundation-server)
[![Version](https://img.shields.io/npm/v/foundation-server.svg)](https://www.npmjs.com/package/foundation-server)
[![Known Vulnerabilities](https://snyk.io/test/npm/foundation-server/badge.svg)](https://snyk.io/test/npm/foundation-server)
[![Discord](https://img.shields.io/discord/738590795384356904)](https://discord.gg/8xtHZFKJQY)

This portal is an extremely efficient, highly scalable, all-in-one, easy to setup cryptocurrency mining platform written entirely in Node.JS. Its main features include a stratum poolserver and reward/payment/share processor. The website functionality has been removed in lieu of a client that will be developed in a separate repository.

For help with getting started, you can check out the documentation for the platform at https://blinkhash.com/docs. Sample configuration files for individual coins are also located at https://github.com/blinkhash/foundation-configurations.

#### Need Support?

If you need help with a code-related matter, the first place to look is our [Discord](https://discord.gg/8xtHZFKJQY), where the developers will be available to answer any questions. However, please do not come to me with issues regarding setup. Use Google and the existing documentation for that.

---

### Specifications

#### Features

* For the pool server it uses the [foundation-stratum](https://github.com/blinkhash/foundation-stratum-pool) module, which supports vardiff, POW/POS, anti-DDoS, IP banning, [multiple hashing algorithms](https://github.com/blinkhash/foundation-multi-hashing).
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

### Donations

Maintaining this project has always been driven out of nothing more than a desire to give back to the mining community, however I always appreciate donations, especially if this repository helps you in any way.

- Bitcoin: 3EbrVYLxN5WeQmPpL6owo3A7rJELXecbbc
- Ethereum: 0xd3e3daED621d228244Fa89A3dd8AF07B52E72319
- Litecoin: MFWpARrSADAy3Qj79C4pSasS9F156QipwC
- ZCash: t1NSk8gyiou8TxWRZTVuUkfM5f9riopN58A

---

### License

Released under the GNU General Public License v2. See http://www.gnu.org/licenses/gpl-2.0.html for more information

---
