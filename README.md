# synthetix-data

[![npm version](https://badge.fury.io/js/synthetix-data.svg)](https://badge.fury.io/js/synthetix-data)
[![Discord](https://img.shields.io/discord/413890591840272394.svg?color=768AD4&label=discord&logo=https%3A%2F%2Fdiscordapp.com%2Fassets%2F8c9701b98ad4372b58f13fd9f65f966e.svg)](https://discordapp.com/channels/413890591840272394/)
[![Twitter Follow](https://img.shields.io/twitter/follow/synthetix_io.svg?label=synthetix_io&style=social)](https://twitter.com/synthetix_io)

This is a collection of utilities to query Synthetix data from Ethereum. This data has been indexed by The Graph via the various subgraphs the Synthetix team maintains ([the subgraph code repo](https://github.com/Synthetixio/synthetix-subgraph)).

## Supported queries

1. `exchanges.since({ timestampInSecs = 1 day ago })` Get the last `N` exchanges since the given timestampInSecs (in seconds, so one hour ago is `3600`). These are ordered in reverse chronological order.
2. `exchanges.total()` Get the total exchange volume, total fees and total number of unique exchange addresses.
3. `depot.userActions({ user })` Get all depot deposit (`sUSD`) actions for the given user - `deposit`, `withdrawl`, `unaccepted`, `removed`.
4. `depot.clearedDeposits({ fromAddress, toAddress })` Get all cleared synth deposits (payments of `ETH` for `sUSD`) either from a given `fromAddress` or (and as well as) to a given `toAddress`
5. `synths.issuers` Get all wallets that have invoked `Issue` on `sUSD` (other synths to come)
6. `synths.transfers` Get synth transfers in reverse chronological order
7. `snx.total` Get the total count of unique `issuers` and `snxHolders`
8. `snx.holders` Get the list of wallets that have ever sent or received `SNX`.
9. `snx.transfers` Get SNX transfers in reverse chronological order

## How to query via the npm library (CLE)

```bash
# get last 24 hours of exchange activity, ordered from latest to earliest
npx synthetix-data exchanges.since
```

### Use as a node or webpack dependency

```javascript
const snxData = require('synthetix-data'); // common js
// or
import snxData from 'synthetix-data'; // es modules

snxData.exchanges.since().then(exchanges => console.log(exchanges));
```

### Use in a browser

```html
<script src="//cdn.jsdelivr.net/npm/synthetix-data/index.min.js"></script>
<script>
	window.snxData.exchanges.since().then(console.log);
</script>
```
