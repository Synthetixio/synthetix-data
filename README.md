# synthetix-data

This is a collection of utilities to query Synthetix data from Ethereum. This data has been indexed by The Graph via the various subgraphs the Synthetix team maintains ([the subgraph code repo](https://github.com/Synthetixio/synthetix-subgraph)).

## Supported queries

1. `exchanges.since({ timestampInSecs = 1 day ago })` Get the last `N` exchanges since the given timestampInSecs (in seconds, so one hour ago is `3600`). These are ordered in reverse chronological order.
2. `exchanges.total()` Get the total exchange volume, total fees and total number of unique exchange addresses.
3. `depot.userActions({ user })` Get all depot deposit (`sUSD`) actions for the given user - `deposit`, `withdrawl`, `unaccepted`, `removed`.
4. `depot.clearedDeposits({ fromAddress, toAddress })` Get all cleared synth deposits (payments of `ETH` for `sUSD`) either from a given `fromAddress` or (and as well as) to a given `toAddress`

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
