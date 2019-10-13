#!/usr/bin/env node

const program = require('commander');
const { exchanges, depot, synths, snx } = require('.');

program
	.command('depot.userActions')
	.option('-u, --user <value>', 'An address')
	.action(async ({ user }) => {
		depot.userActions({ user }).then(console.log);
	});

program
	.command('depot.clearedDeposits')
	.option('-f, --fromAddress <value>', 'A from address')
	.option('-t, --toAddress <value>', 'A to address')
	.action(async ({ fromAddress, toAddress }) => {
		depot.clearedDeposits({ fromAddress, toAddress }).then(console.log);
	});

program.command('exchanges.total').action(async () => {
	exchanges.total().then(console.log);
});

program
	.command('exchanges.since')
	// .option('-s, --since <value>')
	.action(async () => {
		exchanges.since().then(console.log);
	});

program.command('synths.issuers').action(async () => {
	synths.issuers().then(console.log);
});

program.command('snx.holders').action(async () => {
	snx.holders().then(console.log);
});

program.command('snx.total').action(async () => {
	snx.total().then(console.log);
});

program.parse(process.argv);
