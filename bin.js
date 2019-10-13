#!/usr/bin/env node

const program = require('commander');
const { exchanges, depot, synths, snx } = require('.');

program
	.command('depot.userActions')
	.option('-u, --user <value>', 'An address')
	.option('m, --max <value>', 'Maximum number of results', 10)
	.action(async ({ max, user }) => {
		depot.userActions({ max, user }).then(console.log);
	});

program
	.command('depot.clearedDeposits')
	.option('-f, --fromAddress <value>', 'A from address')
	.option('-t, --toAddress <value>', 'A to address')
	.option('m, --max <value>', 'Maximum number of results', 10)
	.action(async ({ fromAddress, toAddress }) => {
		depot.clearedDeposits({ fromAddress, toAddress }).then(console.log);
	});

program.command('exchanges.total').action(async () => {
	exchanges.total().then(console.log);
});

program.command('exchanges.since').action(async () => {
	exchanges.since().then(console.log);
});

program.command('synths.issuers').action(async () => {
	synths.issuers().then(console.log);
});

program
	.command('snx.holders')
	.option('m, --max <value>', 'Maximum number of results', 100)
	.action(async ({ max }) => {
		snx.holders({ max }).then(console.log);
	});

program.command('snx.total').action(async () => {
	snx.total().then(console.log);
});

program
	.command('snx.transfers')
	.option('-f, --from <value>', 'A from address')
	.option('-t, --to <value>', 'A to address')
	.option('m, --max <value>', 'Maximum number of results', 100)
	.action(async ({ from, to, max }) => {
		snx.transfers({ from, to, max }).then(console.log);
	});

program.parse(process.argv);
