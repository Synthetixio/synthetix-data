#!/usr/bin/env node

const program = require('commander');
const stringify = require('csv-stringify');
const { exchanges, depot, synths, rate, snx } = require('.');

program
	.command('depot.userActions')
	.option('-u, --user <value>', 'An address')
	.option('-m, --max <value>', 'Maximum number of results', 10)
	.action(async ({ max, user }) => {
		depot.userActions({ max, user }).then(console.log);
	});

program
	.command('depot.clearedDeposits')
	.option('-f, --fromAddress <value>', 'A from address')
	.option('-t, --toAddress <value>', 'A to address')
	.option('-m, --max <value>', 'Maximum number of results', 10)
	.action(async ({ fromAddress, toAddress }) => {
		depot.clearedDeposits({ fromAddress, toAddress }).then(console.log);
	});

program.command('exchanges.total').action(async () => {
	exchanges.total().then(console.log);
});

program
	.command('exchanges.since')
	.option(
		'-t, --timestampInSecs <value>',
		'Timestamp',
		parseInt,
		Math.floor(Date.now() / 1e3) - 3600 * 24, //default is 1 day ago
	)
	.option('-b, --minBlock <value>', 'The smallest block to include, if any')
	.option('-m, --max <value>', 'Maximum number of results')
	.option('-f, --fromAddress <value>', 'A from address')
	.option('-j, --json', 'Whether or not to display the results as JSON')
	.option('-c, --csv', 'Whether or not to display the results as a CSV')
	.action(async ({ timestampInSecs, minBlock, max, fromAddress, json, csv }) => {
		const results = await exchanges.since({ timestampInSecs, minBlock, max, fromAddress });

		if (json) {
			console.log(JSON.stringify(results, null, 2));
		} else if (csv) {
			const formatted = results.map(
				({
					gasPrice,
					block,
					date,
					hash,
					fromCurrencyKey,
					fromAddress,
					fromAmountInUSD,
					toAmount,
					toAmountInUSD,
					toCurrencyKey,
					toAddress,
					feesInUSD,
				}) => ({
					block,
					date: new Date(date).toString(),
					hash,
					fromCurrencyKey,
					fromAddress,
					fromAmountInUSD,
					toAmount,
					toAmountInUSD,
					toCurrencyKey,
					toAddress,
					feesInUSD,
					gasPrice,
				}),
			);
			stringify(formatted, { header: true }).pipe(process.stdout);
		} else {
			console.log(results);
		}
	});

program.command('synths.issuers').action(async () => {
	synths.issuers().then(console.log);
});

program
	.command('synths.transfers')
	.option('-f, --from <value>', 'A from address')
	.option('-t, --to <value>', 'A to address')
	.option('-m, --max <value>', 'Maximum number of results', 100)
	.option('-s, --synth <value>', 'Synth code')
	.action(async ({ synth, from, to, max }) => {
		synths.transfers({ synth, from, to, max }).then(console.log);
	});

program
	.command('rate.updates')
	.option('-m, --max <value>', 'Maximum number of results', 10)
	.option('-b, --minBlock <value>', 'The smallest block to include, if any')
	.option('-s, --synth <value>', 'Synth code')
	.option('-t, --minTimestamp <value>', 'The oldest timestamp to include')
	.action(async ({ max, synth, minBlock, minTimestamp }) => {
		rate.updates({ max, synth, minBlock, minTimestamp }).then(console.log);
	});

program
	.command('snx.holders')
	.option('-a, --addresses-only', 'Show addresses only')
	.option('-m, --max <value>', 'Maximum number of results', 100)
	.option('-j, --json', 'Whether or not to display the results as JSON')
	.action(async ({ max, addressesOnly, json }) => {
		snx
			.holders({ max, addressesOnly })
			.then(results => (addressesOnly ? results.map(({ address }) => address) : results))
			.then(results => console.log(json ? JSON.stringify(results, null, 2) : results));
	});

program.command('snx.total').action(async () => {
	snx.total().then(console.log);
});

program
	.command('snx.transfers')
	.option('-f, --from <value>', 'A from address')
	.option('-t, --to <value>', 'A to address')
	.option(',m, --max <value>', 'Maximum number of results', 100)
	.action(async ({ from, to, max }) => {
		snx.transfers({ from, to, max }).then(console.log);
	});

program
	.command('snx.rewards')
	.option('-a, --addresses-only', 'Show addresses only')
	.option('-m, --max <value>', 'Maximum number of results', Infinity)
	.option('-j, --json', 'Whether or not to display the results as JSON')

	.action(async ({ max, json, addressesOnly }) => {
		snx
			.rewards({ max })
			.then(results => (addressesOnly ? results.map(({ address }) => address) : results))
			.then(results => console.log(json ? JSON.stringify(results, null, 2) : results));
	});

program.command('exchanges.observe').action(async () => {
	exchanges.observe().subscribe({
		next(val) {
			console.log(val);
		},
	});
});
program.parse(process.argv);
