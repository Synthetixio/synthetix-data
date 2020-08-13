'use strict';

const ws = require('ws');
const { SubscriptionClient } = require('subscriptions-transport-ws');

const pageResults = require('graph-results-pager');

const graphAPIEndpoints = {
	snx: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix',
	depot: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-depot',
	exchanges: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanges',
	rates: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-rates',
	binaryOptions: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-binary-options',
	etherCollateral: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-loans',
	limitOrders: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-limit-orders',
	exchanger: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanger',
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
		exchanges({ network = 'mainnet', from = undefined, max = 100 }) {
			return pageResults({
				api: graphAPIEndpoints.depot,
				query: {
					entity: 'exchanges',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							network: `\\"${network}\\"`,
							from: from ? `\\"${from}\\"` : undefined,
						},
					},
					properties: ['id', 'from', 'fromCurrency', 'fromAmount', 'toCurrency', 'toAmount', 'block', 'timestamp'],
				},
				max,
			})
				.then(results =>
					results.map(({ id, from, fromAmount, fromCurrency, toAmount, toCurrency, block, timestamp }) => ({
						hash: id.split('-')[0],
						from,
						fromAmount: fromAmount / 1e18,
						fromCurrency,
						toAmount: toAmount / 1e18,
						toCurrency,
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
		 * Get the aggregate exchange totals based on time periods.
		 */
		aggregate({ timeSeries = '1d', max = 30 } = {}) {
			let formattedEntity;
			if (timeSeries === '1d') {
				formattedEntity = 'dailyTotals';
			} else if (timeSeries === '15m') {
				formattedEntity = 'fifteenMinuteTotals';
			} else {
				throw new Error('invalid timeSeries: only "1d" or "15m" are valid periods');
			}
			a;

			return pageResults({
				api: graphAPIEndpoints.exchanges,
				max,
				query: {
					entity: `${formattedEntity}`,
					selection: {
						orderBy: 'id',
						orderDirection: 'desc',
					},
					properties: ['id', 'exchangers', 'exchangeUSDTally', 'totalFeesGeneratedInUSD'],
				},
			})
				.then(results =>
					results.map(({ id, exchangers, exchangeUSDTally, totalFeesGeneratedInUSD }) => ({
						id,
						exchangers: Number(exchangers),
						exchangeUSDTally: exchangeUSDTally / 1e18,
						totalFeesGeneratedInUSD: totalFeesGeneratedInUSD / 1e18,
					})),
				)
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

		_rebateOrReclaim({ isReclaim }) {
			return ({
				account = undefined,
				max = Infinity,
				minTimestamp = undefined,
				maxTimestamp = undefined,
				minBlock = undefined,
				maxBlock = undefined,
			} = {}) => {
				return pageResults({
					api: graphAPIEndpoints.exchanges,
					max,
					query: {
						entity: `exchange${isReclaim ? 'Reclaim' : 'Rebate'}s`,
						selection: {
							orderBy: 'timestamp',
							orderDirection: 'desc',
							where: {
								timestamp_gte: minTimestamp || undefined,
								timestamp_lte: maxTimestamp || undefined,
								block_gte: minBlock || undefined,
								block_lte: maxBlock || undefined,
								account: account ? `\\"${account}\\"` : undefined,
							},
						},
						properties: ['id', 'amount', 'amountInUSD', 'currencyKey', 'account', 'timestamp', 'block', 'gasPrice'],
					},
				})
					.then(results =>
						results.map(({ gasPrice, timestamp, id, account, block, currencyKey, amount, amountInUSD }) => ({
							gasPrice: gasPrice / 1e9,
							block: Number(block),
							timestamp: Number(timestamp * 1000),
							date: new Date(timestamp * 1000),
							hash: id.split('-')[0],
							account,
							amount: amount / 1e18, // shorthand way to convert wei into eth,
							amountInUSD: amountInUSD / 1e18,
							currencyKey: hexToAscii(currencyKey),
							currencyKeyBytes: currencyKey,
						})),
					)
					.catch(err => console.error(err));
			};
		},

		reclaims(args) {
			return this._rebateOrReclaim({ isReclaim: true })(args);
		},

		rebates(args) {
			return this._rebateOrReclaim({ isReclaim: false })(args);
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

		holders({ max = 100, synth = undefined, address = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'synthHolders',
					selection: {
						orderBy: 'block',
						orderDirection: 'desc',
						where: {
							account: address ? `\\"${address}\\"` : undefined,
							source: synth ? `\\"${synth}\\"` : undefined,
						},
					},
					properties: [
						'id',
						'account', // the address of the holder
						'block', // the block this entity was last updated in
						'timestamp', // the timestamp when this entity was last updated
						'balanceOf', // SNX balance in their wallet
						'source', // The synth currencyKey
					],
				},
			})
				.then(results =>
					results.map(({ id, account, block, timestamp, balanceOf, source }) => ({
						hash: id.split('-')[0],
						address: account,
						block: Number(block),
						timestamp: Number(timestamp * 1000),
						date: new Date(timestamp * 1000),
						balanceOf: balanceOf ? balanceOf / 1e18 : null,
						source,
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
		issued({ max = 100, account = undefined, minBlock = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'issueds',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							account: account ? `\\"${account}\\"` : undefined,
							block_gte: minBlock || undefined,
						},
					},
					properties: [
						'id', // the transaction hash
						'account', // the address of the burner
						'timestamp', // the timestamp when this transaction happened
						'block', // the block in which this transaction happened
						'value', // the issued amount in sUSD
					],
				},
			})
				.then(results =>
					results.map(({ id, account, timestamp, block, value }) => ({
						hash: id,
						account,
						timestamp: Number(timestamp * 1000),
						block: Number(block),
						value: value / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},

		burned({ max = 100, account = undefined, minBlock = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'burneds',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							account: account ? `\\"${account}\\"` : undefined,
							block_gte: minBlock || undefined,
						},
					},
					properties: [
						'id', // the transaction hash
						'account', // the address of the burner
						'timestamp', // the timestamp when this transaction happened
						'block', // the block in which this transaction happened
						'value', // the burned amount in sUSD
					],
				},
			})
				.then(results =>
					results.map(({ id, account, timestamp, block, value }) => ({
						hash: id,
						account,
						timestamp: Number(timestamp * 1000),
						block: Number(block),
						value: value / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},

		holders({ max = 100, address = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'snxholders',
					selection: {
						orderBy: 'collateral',
						orderDirection: 'desc',
						where: {
							id: address ? `\\"${address}\\"` : undefined,
						},
					},
					properties: [
						'id', // the address of the holder
						'block', // the block this entity was last updated in
						'timestamp', // the timestamp when this entity was last updated
						'collateral', // Synthetix.collateral (all collateral the account has, including escrowed )
						'balanceOf', // SNX balance in their wallet
						'transferable', // All non-locked SNX
						'initialDebtOwnership', // Debt data from SynthetixState, used to calculate debtBalance
						'debtEntryAtIndex', // Debt data from SynthetixState, used to calculate debtBalance
					],
				},
			})
				.then(results =>
					results.map(
						({
							id,
							collateral,
							block,
							timestamp,
							balanceOf,
							transferable,
							initialDebtOwnership,
							debtEntryAtIndex,
						}) => ({
							address: id,
							block: Number(block),
							timestamp: Number(timestamp * 1000),
							date: new Date(timestamp * 1000),
							collateral: collateral ? collateral / 1e18 : null,
							balanceOf: balanceOf ? balanceOf / 1e18 : null,
							transferable: transferable ? transferable / 1e18 : null,
							// Use 1e27 as the below entries are high precision decimals (see SafeDecimalMath.sol in @Synthetixio/synthetix)
							initialDebtOwnership: initialDebtOwnership ? initialDebtOwnership / 1e27 : null,
							debtEntryAtIndex: debtEntryAtIndex ? debtEntryAtIndex / 1e27 : null,
						}),
					),
				)
				.catch(err => console.error(err));
		},

		rewards({ max = 100 } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'rewardEscrowHolders',
					selection: {
						orderBy: 'balanceOf',
						orderDirection: 'desc',
					},
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
		feesClaimed({ max = 100, account = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'feesClaimeds',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							account: account ? `\\"${account}\\"` : undefined,
						},
					},
					properties: [
						'id', // the transaction hash
						'account', // the address of the claimer
						'timestamp', // the timestamp when this transaction happened
						'block', // the block in which this transaction happened
						'value', // the claimed amount in sUSD
						'rewards', // the rewards amount in SNX
					],
				},
			})
				.then(results =>
					results.map(({ id, account, timestamp, block, value, rewards }) => ({
						hash: id.split('-')[0],
						account,
						timestamp: Number(timestamp * 1000),
						block: Number(block),
						value: value / 1e18,
						rewards: rewards / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},
		debtSnapshot({ account = undefined, max = 100, minBlock = undefined, maxBlock = undefined }) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'debtSnapshots',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							account: account ? `\\"${account}\\"` : undefined,
							block_gte: minBlock || undefined,
							block_lte: maxBlock || undefined,
						},
					},
					properties: [
						'id', // the transaction hash
						'timestamp', // the timestamp when this transaction happened
						'block', // the block in which this transaction happened
						'account', // the address of debt holder
						'balanceOf', // SNX balance in their wallet,
						'collateral', // Synthetix.collateral (all collateral the account has, including escrowed )'collateral', // Synthetix.collateral (all collateral the account has, including escrowed )
						'debtBalanceOf', // Account's Debt balance in sUSD
					],
				},
			})
				.then(results =>
					results.map(({ id, timestamp, block, account, balanceOf, collateral, debtBalanceOf }) => ({
						id,
						timestamp: Number(timestamp * 1000),
						block: Number(block),
						account,
						balanceOf: balanceOf ? balanceOf / 1e18 : null,
						collateral: collateral ? collateral / 1e18 : null,
						debtBalanceOf: debtBalanceOf ? debtBalanceOf / 1e18 : null,
					})),
				)
				.catch(err => console.error(err));
		},
	},
	binaryOptions: {
		markets({ max = 100, creator = undefined, isOpen = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.binaryOptions,
				max,
				query: {
					entity: 'markets',
					selection: {
						orderBy: 'biddingEndDate',
						orderDirection: 'desc',
						where: {
							creator: creator ? `\\"${creator}\\"` : undefined,
							isOpen: isOpen !== undefined ? isOpen : undefined,
						},
					},
					properties: [
						'id',
						'timestamp',
						'creator',
						'currencyKey',
						'strikePrice',
						'biddingEndDate',
						'maturityDate',
						'expiryDate',
						'isOpen',
						'longPrice',
						'shortPrice',
						'poolSize',
						'result',
					],
				},
			}).then(results =>
				results.map(
					({
						id,
						timestamp,
						creator,
						currencyKey,
						strikePrice,
						biddingEndDate,
						maturityDate,
						expiryDate,
						isOpen,
						longPrice,
						shortPrice,
						poolSize,
						result,
					}) => ({
						address: id,
						timestamp: Number(timestamp * 1000),
						creator,
						currencyKey: hexToAscii(currencyKey),
						strikePrice: strikePrice / 1e18,
						biddingEndDate: Number(biddingEndDate) * 1000,
						maturityDate: Number(maturityDate) * 1000,
						expiryDate: Number(expiryDate) * 1000,
						isOpen,
						longPrice: longPrice / 1e18,
						shortPrice: shortPrice / 1e18,
						poolSize: poolSize / 1e18,
						result: result !== null ? (result === 0 ? 'long' : 'short') : null,
					}),
				),
			);
		},
		optionTransactions({ max = Infinity, market = undefined, account = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.binaryOptions,
				max,
				query: {
					entity: 'optionTransactions',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							market: market ? `\\"${market}\\"` : undefined,
							account: account ? `\\"${account}\\"` : undefined,
						},
					},
					properties: ['id', 'timestamp', 'type', 'account', 'currencyKey', 'side', 'amount', 'market', 'fee'],
				},
			}).then(results =>
				results.map(({ id, timestamp, type, account, currencyKey, side, amount, market, fee }) => ({
					hash: id.split('-')[0],
					timestamp: Number(timestamp * 1000),
					type,
					account,
					currencyKey: currencyKey ? hexToAscii(currencyKey) : null,
					side: side === 0 ? 'long' : 'short',
					amount: amount / 1e18,
					market,
					fee: fee ? fee / 1e18 : null,
				})),
			);
		},
		marketsBidOn({ max = Infinity, account = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.binaryOptions,
				max,
				query: {
					entity: 'optionTransactions',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							type: 'bid',
							account: account ? `\\"${account}\\"` : undefined,
						},
					},
					properties: ['market'],
				},
			}).then(results => results.map(({ market }) => market).filter((val, i, arr) => arr.indexOf(val) === i));
		},
		historicalOptionPrice({
			max = Infinity,
			market = undefined,
			minTimestamp = undefined,
			maxTimestamp = undefined,
		} = {}) {
			return pageResults({
				api: graphAPIEndpoints.binaryOptions,
				max,
				query: {
					entity: 'historicalOptionPrices',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							market: market ? `\\"${market}\\"` : undefined,
							timestamp_gte: minTimestamp || undefined,
							timestamp_lte: maxTimestamp || undefined,
						},
					},
					properties: ['id', 'timestamp', 'longPrice', 'shortPrice', 'poolSize', 'market'],
				},
			}).then(results =>
				results.map(({ id, timestamp, longPrice, shortPrice, poolSize, market }) => ({
					id,
					timestamp: Number(timestamp * 1000),
					longPrice: longPrice / 1e18,
					shortPrice: shortPrice / 1e18,
					poolSize: poolSize / 1e18,
					market,
				})),
			);
		},
	},
	etherCollateral: {
		loans({ max = Infinity, isOpen = undefined, account = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.etherCollateral,
				max,
				query: {
					entity: 'loans',
					selection: {
						orderBy: 'createdAt',
						orderDirection: 'desc',
						where: {
							account: account ? `\\"${account}\\"` : undefined,
							isOpen,
						},
					},
					properties: ['id', 'account', 'amount', 'isOpen', 'createdAt', 'closedAt'],
				},
			})
				.then(results =>
					results.map(({ id, account, amount, isOpen, createdAt, closedAt }) => ({
						id: Number(id),
						account,
						createdAt: new Date(Number(createdAt * 1000)),
						closedAt: closedAt ? new Date(Number(closedAt * 1000)) : null,
						amount: amount / 1e18,
						isOpen,
					})),
				)
				.catch(err => console.error(err));
		},
	},
	limitOrders: {
		orders({ max = Infinity, account = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.limitOrders,
				max,
				query: {
					entity: 'limitOrders',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							submitter: account ? `\\"${account}\\"` : undefined,
						},
					},
					properties: [
						'id',
						'hash',
						'timestamp',
						'submitter',
						'sourceCurrencyKey',
						'sourceAmount',
						'destinationCurrencyKey',
						'minDestinationAmount',
						'executionFee',
						'deposit',
						'status',
					],
				},
			})
				.then(results =>
					results.map(
						({
							id,
							hash,
							timestamp,
							submitter,
							sourceCurrencyKey,
							sourceAmount,
							destinationCurrencyKey,
							minDestinationAmount,
							executionFee,
							deposit,
							status,
						}) => ({
							id: Number(id),
							hash,
							timestamp: Number(timestamp * 1000),
							account: submitter,
							sourceCurrencyKey: hexToAscii(sourceCurrencyKey),
							sourceAmount: sourceAmount / 1e18,
							destinationCurrencyKey: hexToAscii(destinationCurrencyKey),
							minDestinationAmount: minDestinationAmount / 1e18,
							executionFee: executionFee / 1e18,
							deposit: deposit / 1e18,
							status,
						}),
					),
				)
				.catch(err => console.error(err));
		},
	},
	exchanger: {
		exchangeEntriesSettled({ max = 100, from = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.exchanger,
				max,
				query: {
					entity: 'exchangeEntrySettleds',
					selection: {
						orderBy: 'exchangeTimestamp',
						orderDirection: 'desc',
						where: {
							from: from ? `\\"${from}\\"` : undefined,
						},
					},
					properties: [
						'id',
						'from',
						'src',
						'amount',
						'dest',
						'reclaim',
						'rebate',
						'srcRoundIdAtPeriodEnd',
						'destRoundIdAtPeriodEnd',
						'exchangeTimestamp',
					],
				},
			})
				.then(results =>
					results.map(
						({
							id,
							from,
							src,
							amount,
							dest,
							reclaim,
							rebate,
							srcRoundIdAtPeriodEnd,
							destRoundIdAtPeriodEnd,
							exchangeTimestamp,
						}) => ({
							hash: id.split('-')[0],
							from,
							src: hexToAscii(src),
							amount: amount / 1e18,
							dest: hexToAscii(dest),
							reclaim: reclaim / 1e18,
							rebate: rebate / 1e18,
							srcRoundIdAtPeriodEnd: srcRoundIdAtPeriodEnd / 1e18,
							destRoundIdAtPeriodEnd: destRoundIdAtPeriodEnd / 1e18,
							exchangeTimestamp: Number(exchangeTimestamp * 1000),
						}),
					),
				)
				.catch(err => console.error(err));
		},
	},
};
