#!/usr/bin/env node

const program = require('commander');
const stringify = require('csv-stringify');
const moment = require('moment');

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
	.option('-f, --from-address <value>', 'A from address')
	.option('-t, --to-address <value>', 'A to address')
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
		'-t, --min-timestamp <value>',
		'Timestamp',
		Math.floor(Date.now() / 1e3) - 3600 * 24, //default is 1 day ago
	)
	.option('-b, --min-block <value>', 'The smallest block to include, if any')
	.option('-m, --max <value>', 'Maximum number of results')
	.option('-f, --from-address <value>', 'A from address')
	.option('-j, --json', 'Whether or not to display the results as JSON')
	.option('-c, --csv', 'Whether or not to display the results as a CSV')
	.action(async ({ minTimestamp, minBlock, max, fromAddress, json, csv }) => {
		const results = await exchanges.since({ minTimestamp, minBlock, max, fromAddress });

		if (json) {
			console.log(JSON.stringify(results, null, 2));
		} else if (csv) {
			const formatted = results.map(result => {
				return Object.assign({}, result, {
					date: new Date(result.date).toString(),
					fromCurrencyKeyBytes: undefined,
					toCurrencyKeyBytes: undefined,
				});
			});
			stringify(formatted, { header: true }).pipe(process.stdout);
		} else {
			console.log(results);
		}
	});

const doReclaimRebates = ({ prg, isReclaim }) => {
	prg
		.command(`exchanges.${isReclaim ? 'reclaims' : 'rebates'}`)
		.option(
			'-t, --min-timestamp <value>',
			'Timestamp',
			Math.floor(Date.now() / 1e3) - 3600 * 24, //default is 1 day ago
		)
		.option('-b, --min-block <value>', 'The smallest block to include, if any')
		.option('-m, --max <value>', 'Maximum number of results')
		.option('-a, --account <value>', 'An address')
		.option('-j, --json', 'Whether or not to display the results as JSON')
		.action(async ({ minTimestamp, minBlock, max, account, json }) => {
			const results = await exchanges[isReclaim ? 'reclaims' : 'rebates']({ minTimestamp, minBlock, max, account });

			if (json) {
				console.log(JSON.stringify(results, null, 2));
			} else {
				console.log(results);
			}
			console.log('----------------------');
			console.log('Number of entries:', results.length);
			const totalInUSD = results.reduce((memo, { amountInUSD }) => memo + amountInUSD, 0);
			console.log(`Total in USD $${Math.round(totalInUSD)}`);
		});
};

// add command exchanges.reclaims
doReclaimRebates({ prg: program, isReclaim: true });

// add command exchanges.rebates
doReclaimRebates({ prg: program, isReclaim: false });

program
	.command('exchanges.grouped')
	.option('-t, --type <value>', 'The type of unit - months, weeks or days', 'days')
	.option('-n, --unit <value>', 'The number of units (months, weeks, days) back to include prior to the current', 0)
	.option('-j, --json', 'Whether or not to display the results as JSON')
	.option('-c, --csv', 'Whether or not to display the results as a CSV')
	.action(async ({ type, unit, json, csv }) => {
		const typeToLabelFormatMap = {
			months: ts => moment(ts).format('MMM YY'),
			weeks: ts => 'Week ' + moment(ts).format('ww, YY'),
			days: ts => moment(ts).format('DD MMM YY'),
		};
		const typeWithoutPlural = type.slice(0, type.length - 1);
		// get entries from beyond a certain point
		const minTimestamp = moment()
			.startOf(typeWithoutPlural)
			.subtract(unit, type)
			.unix();

		// results are reverse chronologically ordered
		const results = await exchanges.since({ minTimestamp });
		const groups = [];
		const _cache = {};
		const lastMomentInWindow = moment(results[0].timestamp).endOf(typeWithoutPlural);

		for (const { timestamp, fromAmountInUSD, feesInUSD, fromAddress } of results) {
			const i = Math.abs(moment(timestamp).diff(lastMomentInWindow, type));
			// initialize the grouping
			groups[i] = groups[i] || {
				volume: 0,
				fees: 0,
				unique: 0,
				trades: 0,
				label: typeToLabelFormatMap[type](timestamp),
			};
			_cache[i] = _cache[i] || {};

			groups[i].volume = Math.round(fromAmountInUSD + groups[i].volume);
			groups[i].fees = Math.round(feesInUSD + groups[i].fees);
			groups[i].unique += !_cache[i][fromAddress] ? 1 : 0;
			groups[i].trades++;

			_cache[i][fromAddress] = true; // track this address
		}

		if (json) {
			console.log(JSON.stringify(groups, null, 2));
		} else if (csv) {
			stringify(groups, { header: true }).pipe(process.stdout);
		} else {
			console.log(groups);
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
	.option('-b, --min-block <value>', 'The smallest block to include, if any')
	.option('-B, --max-block <value>', 'The biggest block to include, if any')
	.option('-s, --synth <value>', 'Synth code')
	.option('-t, --minTimestamp <value>', 'The oldest timestamp to include, if any')
	.option('-T, --maxTimestamp <value>', 'The youngest timestamp to include, if any')
	.action(async ({ max, synth, minBlock, maxBlock, minTimestamp, maxTimestamp }) => {
		rate.updates({ max, synth, minBlock, maxBlock, minTimestamp, maxTimestamp }).then(console.log);
	});

program
	.command('snx.holders')
	.option('-a, --address <value>', 'Address to filter on, if any')
	.option('-m, --max <value>', 'Maximum number of results', 100)
	.option('-o, --addresses-only', 'Show addresses only')
	.option('-j, --json', 'Whether or not to display the results as JSON')
	.action(async ({ max, addressesOnly, address, json }) => {
		snx
			.holders({ max, address, addressesOnly })
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

program
	.command('snx.burned')
	.option('-a, --account <value>', 'Account to filter on, if any')
	.option('-m, --max <value>', 'Maximum number of results', Infinity)

	.action(async ({ max, account }) => {
		snx.burned({ max, account }).then(console.log);
	});

program
	.command('snx.issued')
	.option('-a, --account <value>', 'Account to filter on, if any')
	.option('-m, --max <value>', 'Maximum number of results', Infinity)

	.action(async ({ max, account }) => {
		snx.issued({ max, account }).then(console.log);
	});

program
	.command('snx.feesClaimed')
	.option('-a, --account <value>', 'Account to filter on, if any')
	.option('-m, --max <value>', 'Maximum number of results', 100)

	.action(async ({ max, account }) => {
		snx.feesClaimed({ max, account }).then(console.log);
	});

program.command('exchanges.observe').action(async () => {
	exchanges.observe().subscribe({
		next(val) {
			console.log(val);
		},
	});
});

program.command('rate.observe').action(async () => {
	rate.observe().subscribe({
		next(val) {
			console.log(val);
		},
	});
});
program.parse(process.argv);
