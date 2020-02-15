'use strict';

const ws = require('ws');
const { SubscriptionClient } = require('subscriptions-transport-ws');

const pageResults = require('graph-results-pager');

const graphAPIEndpoints = {
	snx: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix',
	depot: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-depot',
	exchanges: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanges',
	rates: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-rates',
};

const graphWSEndpoints = {
	exchanges: 'wss://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanges',
	rates: 'wss://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-rates',
};

const ZERO_ADDRESS = '0x' + '0'.repeat(40);

const hexToAscii = str => {
	const hex = str.toString();
	let out = '';
	for (let n = 2; n < hex.length; n += 2) {
		const nextPair = hex.substr(n, 2);
		if (nextPair !== '00') {
			out += String.fromCharCode(parseInt(nextPair, 16));
		}
	}
	return out;
};

module.exports = {
	pageResults,
	graphAPIEndpoints,
	depot: {
		userActions({ network = 'mainnet', user = undefined, max = 100 }) {
			return pageResults({
				api: graphAPIEndpoints.depot,
				query: {
					entity: 'userActions',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							network: `\\"${network}\\"`,
							user: user ? `\\"${user}\\"` : undefined,
						},
					},
					properties: ['id', 'user', 'amount', 'minimum', 'depositIndex', 'type', 'block', 'timestamp'],
				},
				max,
			})
				.then(results =>
					results.map(({ id, user, amount, type, minimum, depositIndex, block, timestamp }) => ({
						hash: id.split('-')[0],
						user,
						amount: amount / 1e18,
						type,
						minimum: minimum !== null ? Number(minimum) : null,
						depositIndex: depositIndex !== null ? Number(depositIndex) : null,
						block: Number(block),
						timestamp: Number(timestamp * 1000),
						date: new Date(timestamp * 1000),
					})),
				)
				.catch(err => console.error(err));
		},
		clearedDeposits({ network = 'mainnet', fromAddress = undefined, toAddress = undefined, max = 100 }) {
			return pageResults({
				api: graphAPIEndpoints.depot,
				query: {
					entity: 'clearedDeposits',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							network: `\\"${network}\\"`,
							fromAddress: fromAddress ? `\\"${fromAddress}\\"` : undefined,
							toAddress: toAddress ? `\\"${toAddress}\\"` : undefined,
						},
					},
					properties: [
						'id',
						'fromAddress',
						'toAddress',
						'fromETHAmount',
						'toAmount',
						'depositIndex',
						'block',
						'timestamp',
					],
				},
				max,
			})
				.then(results =>
					results.map(({ id, fromAddress, toAddress, fromETHAmount, toAmount, depositIndex, block, timestamp }) => ({
						hash: id.split('-')[0],
						fromAddress,
						toAddress,
						fromETHAmount: fromETHAmount / 1e18,
						toAmount: toAmount / 1e18,
						depositIndex: depositIndex !== null ? Number(depositIndex) : null,
						block: Number(block),
						timestamp: Number(timestamp * 1000),
						date: new Date(timestamp * 1000),
					})),
				)
				.catch(err => console.error(err));
		},
	},
	exchanges: {
		_properties: [
			'id',
			'from',
			'gasPrice',
			'from',
			'fromAmount',
			'fromAmountInUSD',
			'fromCurrencyKey',
			'toCurrencyKey',
			'toAddress',
			'toAmount',
			'toAmountInUSD',
			'feesInUSD',
			'block',
			'timestamp',
		],
		_mapSynthExchange: ({
			gasPrice,
			timestamp,
			id,
			from,
			fromAmount,
			block,
			fromAmountInUSD,
			fromCurrencyKey,
			toAddress,
			toAmount,
			toAmountInUSD,
			toCurrencyKey,
			feesInUSD,
		}) => ({
			gasPrice: gasPrice / 1e9,
			block: Number(block),
			timestamp: Number(timestamp * 1000),
			date: new Date(timestamp * 1000),
			hash: id.split('-')[0],
			fromAddress: from,
			fromAmount: fromAmount / 1e18, // shorthand way to convert wei into eth
			fromCurrencyKeyBytes: fromCurrencyKey,
			fromCurrencyKey: hexToAscii(fromCurrencyKey),
			fromAmountInUSD: fromAmountInUSD / 1e18,
			toAmount: toAmount / 1e18,
			toAmountInUSD: toAmountInUSD / 1e18,
			toCurrencyKeyBytes: toCurrencyKey,
			toCurrencyKey: hexToAscii(toCurrencyKey),
			toAddress,
			feesInUSD: feesInUSD / 1e18,
		}),

		/**
		 * Get the exchange totals for the given network.
		 */
		total({ network = 'mainnet' } = {}) {
			return pageResults({
				api: graphAPIEndpoints.exchanges,
				query: {
					entity: 'totals',
					selection: {
						where: {
							id: `\\"${network}\\"`,
						},
					},
					properties: ['exchangers', 'exchangeUSDTally', 'totalFeesGeneratedInUSD'],
				},
				max: 1,
			})
				.then(([{ exchangers, exchangeUSDTally, totalFeesGeneratedInUSD }]) => ({
					exchangers: Number(exchangers),
					exchangeUSDTally: exchangeUSDTally / 1e18,
					totalFeesGeneratedInUSD: totalFeesGeneratedInUSD / 1e18,
				}))
				.catch(err => console.error(err));
		},
		/**
		 * Get all exchanges since some timestamp in seconds or minimum block (ordered reverse chronological)
		 */
		since({
			network = 'mainnet',
			max = Infinity,
			minTimestamp = undefined,
			maxTimestamp = undefined,
			minBlock = undefined,
			maxBlock = undefined,
			fromAddress = undefined,
		} = {}) {
			return pageResults({
				api: graphAPIEndpoints.exchanges,
				max,
				query: {
					entity: 'synthExchanges',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							network: `\\"${network}\\"`,
							timestamp_gte: minTimestamp || undefined,
							timestamp_lte: maxTimestamp || undefined,
							block_gte: minBlock || undefined,
							block_lte: maxBlock || undefined,
							from: fromAddress ? `\\"${fromAddress}\\"` : undefined,
						},
					},
					properties: module.exports.exchanges._properties,
				},
			})
				.then(results => results.map(module.exports.exchanges._mapSynthExchange))
				.catch(err => console.error(err));
		},
		observe() {
			const client = new SubscriptionClient(
				graphWSEndpoints.exchanges,
				{
					reconnect: true,
				},
				ws,
			);

			const observable = client.request({
				query: `subscription { synthExchanges(first: 1, orderBy: timestamp, orderDirection: desc) { ${module.exports.exchanges._properties.join(
					',',
				)}  } }`,
			});

			return {
				// return an observable object that transforms the results before yielding them
				subscribe({ next, error, complete }) {
					return observable.subscribe({
						next({ data: { synthExchanges } }) {
							synthExchanges.map(module.exports.exchanges._mapSynthExchange).forEach(next);
						},
						error,
						complete,
					});
				},
			};
		},
	},
	synths: {
		issuers({ max = 10 } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'issuers',
					properties: ['id'],
				},
			})
				.then(results => results.map(({ id }) => id))
				.catch(err => console.error(err));
		},
		/**
		 * Get the latest synth transfers
		 */
		transfers({
			synth = undefined,
			from = undefined,
			to = undefined,
			max = 100,
			minBlock = undefined,
			maxBlock = undefined,
		} = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'transfers',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							source: synth ? `\\"${synth}\\"` : undefined,
							source_not: '\\"SNX\\"',
							from: from ? `\\"${from}\\"` : undefined,
							to: to ? `\\"${to}\\"` : undefined,
							from_not: `\\"${ZERO_ADDRESS}\\"`, // Ignore Issue events
							to_not: `\\"${ZERO_ADDRESS}\\"`, // Ignore Burn events
							block_gte: minBlock || undefined,
							block_lte: maxBlock || undefined,
						},
					},
					properties: ['id', 'source', 'to', 'from', 'value', 'block', 'timestamp'],
				},
			})
				.then(results =>
					results.map(({ id, source, block, timestamp, from, to, value }) => ({
						source,
						block: Number(block),
						timestamp: Number(timestamp * 1000),
						date: new Date(timestamp * 1000),
						hash: id.split('-')[0],
						from,
						to,
						value: value / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},
	},
	rate: {
		/**
		 * Get the last max RateUpdate events for the given synth in reverse order
		 */
		updates({
			synth,
			minBlock = undefined,
			maxBlock = undefined,
			minTimestamp = undefined,
			maxTimestamp = undefined,
			max = 100,
		} = {}) {
			return pageResults({
				api: graphAPIEndpoints.rates,
				max,
				query: {
					entity: 'rateUpdates',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							synth: synth ? `\\"${synth}\\"` : undefined,
							synth_not_in: !synth
								? '[' + ['SNX', 'ETH', 'XDR'].map(code => `\\"${code}\\"`).join(',') + ']'
								: undefined, // ignore non-synth prices
							block_gte: minBlock || undefined,
							block_lte: maxBlock || undefined,
							timestamp_gte: minTimestamp || undefined,
							timestamp_lte: maxTimestamp || undefined,
						},
					},
					properties: ['id', 'synth', 'rate', 'block', 'timestamp'],
				},
			})
				.then(results =>
					results.map(({ id, rate, block, timestamp, synth }) => ({
						block: Number(block),
						synth,
						timestamp: Number(timestamp * 1000),
						date: new Date(timestamp * 1000),
						hash: id.split('-')[0],
						rate: rate / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},
		observe({ minTimestamp = Math.round(Date.now() / 1000) } = {}) {
			const client = new SubscriptionClient(
				graphWSEndpoints.rates,
				{
					reconnect: true,
				},
				ws,
			);

			// Note: we can't use "first" here as some updates come together (the SNX oracle groups together some rates)
			const observable = client.request({
				query: `subscription { rateUpdates(where: { timestamp_gt: ${minTimestamp}}, orderBy: timestamp, orderDirection: desc) { ${[
					'id',
					'synth',
					'rate',
					'block',
					'timestamp',
				].join(',')}  } }`,
			});

			return {
				// return an observable object that transforms the results before yielding them
				subscribe({ next, error, complete }) {
					return observable.subscribe({
						next({ data: { rateUpdates } }) {
							rateUpdates.forEach(next);
						},
						error,
						complete,
					});
				},
			};
		},
	},
	snx: {
		holders({ max = 100 } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'snxholders',
					selection: {
						orderBy: 'collateral',
						orderDirection: 'desc',
					},
					properties: ['id', 'collateral'],
				},
			})
				.then(results =>
					results.map(({ id, collateral }) => ({
						address: id,
						collateral: collateral ? collateral / 1e18 : null,
					})),
				)
				.catch(err => console.error(err));
		},

		rewards({ max = 100 } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'rewardEscrowHolders',
					properties: ['id', 'balanceOf'],
				},
			})
				.then(results =>
					results.map(({ id, balanceOf }) => ({
						address: id,
						balance: balanceOf / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},
		/**
		 * Get the exchange totals for the given network.
		 */
		total() {
			return pageResults({
				api: graphAPIEndpoints.snx,
				query: {
					entity: 'synthetixes',
					selection: {
						where: {
							id: 1,
						},
					},
					properties: ['issuers', 'snxHolders'],
				},
				max: 1,
			})
				.then(([{ issuers, snxHolders }]) => ({
					issuers: Number(issuers),
					snxHolders: Number(snxHolders),
				}))
				.catch(err => console.error(err));
		},
		/**
		 * Get the latest SNX transfers
		 */
		transfers({ from = undefined, to = undefined, max = 100, minBlock = undefined, maxBlock = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'transfers',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							source: '\\"SNX\\"',
							from: from ? `\\"${from}\\"` : undefined,
							to: to ? `\\"${to}\\"` : undefined,
							block_gte: minBlock || undefined,
							block_lte: maxBlock || undefined,
						},
					},
					properties: ['id', 'to', 'from', 'value', 'block', 'timestamp'],
				},
			})
				.then(results =>
					results.map(({ id, block, timestamp, from, to, value }) => ({
						block: Number(block),
						timestamp: Number(timestamp * 1000),
						date: new Date(timestamp * 1000),
						hash: id.split('-')[0],
						from,
						to,
						value: value / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},
	},
};
