'use strict';

const ws = require('ws');
const { SubscriptionClient } = require('subscriptions-transport-ws');

const pageResults = require('graph-results-pager');

const {
	ZERO_ADDRESS,
	hexToAscii,
	roundTimestampTenSeconds,
	getHashFromId,
	formatGQLArray,
	formatGQLString,
} = require('./utils');

const graphAPIEndpoints = {
	snx: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix',
	depot: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-depot',
	exchanges: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanges',
	rates: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-rates',
	binaryOptions: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-binary-options',
	etherCollateral: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-loans',
	limitOrders: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-limit-orders',
	exchanger: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanger',
	liquidations: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-liquidations',
};

const graphWSEndpoints = {
	exchanges: 'wss://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanges',
	rates: 'wss://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-rates',
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
						hash: getHashFromId(id),
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
				.catch(err => console.log(err));
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
						hash: getHashFromId(id),
						fromAddress,
						toAddress,
						fromETHAmount: fromETHAmount / 1e18,
						toAmount: toAmount / 1e18,
						depositIndex: depositIndex !== null ? Number(depositIndex) : null,
						block: Number(block),
						timestamp: Number(timestamp * 1000),
						date: new Date(timestamp * 1000),
						type: 'cleared',
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
						hash: getHashFromId(id),
						from,
						fromAmount: fromAmount / 1e18,
						fromCurrency,
						toAmount: toAmount / 1e18,
						toCurrency,
						block: Number(block),
						timestamp: Number(timestamp * 1000),
						date: new Date(timestamp * 1000),
						type: 'bought',
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
			hash: getHashFromId(id),
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
					properties: ['trades', 'exchangers', 'exchangeUSDTally', 'totalFeesGeneratedInUSD'],
				},
				max: 1,
			})
				.then(([{ exchangers, exchangeUSDTally, totalFeesGeneratedInUSD, trades }]) => ({
					trades: Number(trades),
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
			const entityMap = { '1d': 'dailyTotals', '15m': 'fifteenMinuteTotals' };
			return pageResults({
				api: graphAPIEndpoints.exchanges,
				max,
				query: {
					entity: `${entityMap[timeSeries]}`,
					selection: {
						orderBy: 'id',
						orderDirection: 'desc',
					},
					properties: ['id', 'trades', 'exchangers', 'exchangeUSDTally', 'totalFeesGeneratedInUSD'],
				},
			})
				.then(results =>
					results.map(({ id, trades, exchangers, exchangeUSDTally, totalFeesGeneratedInUSD }) => ({
						id,
						trades: Number(trades),
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
							timestamp_gte: roundTimestampTenSeconds(minTimestamp) || undefined,
							timestamp_lte: roundTimestampTenSeconds(maxTimestamp) || undefined,
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
							hash: getHashFromId(id),
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
						hash: getHashFromId(id),
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
						orderBy: 'balanceOf',
						orderDirection: 'desc',
						where: {
							id: address && synth ? `\\"${address + '-' + synth}\\"` : undefined,
							synth: synth ? `\\"${synth}\\"` : undefined,
						},
					},
					properties: [
						'id', // the address of the holder plus the synth
						'balanceOf', // synth balance in their wallet
						'synth', // The synth currencyKey
					],
				},
			})
				.then(results =>
					results.map(({ id, balanceOf, synth }) => ({
						address: getHashFromId(id),
						balanceOf: balanceOf ? balanceOf / 1e18 : null,
						synth,
					})),
				)
				.catch(err => console.error(err));
		},
	},
	rate: {
		snxAggregate({ timeSeries = '1d', max = 30 } = {}) {
			const entityMap = { '1d': 'dailySNXPrices', '15m': 'fifteenMinuteSNXPrices' };
			return pageResults({
				api: graphAPIEndpoints.rates,
				max,
				query: {
					entity: `${entityMap[timeSeries]}`,
					selection: {
						orderBy: 'id',
						orderDirection: 'desc',
					},
					properties: ['id', 'averagePrice'],
				},
			})
				.then(results =>
					results.map(({ id, averagePrice }) => ({
						id,
						averagePrice: averagePrice / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},
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
			let synthSelectionQuery = {};

			if (Array.isArray(synth)) {
				synthSelectionQuery = {
					synth_in: formatGQLArray(synth),
				};
			} else if (synth) {
				synthSelectionQuery = {
					synth: formatGQLString(synth),
				};
			} else {
				synthSelectionQuery = {
					synth_not_in: formatGQLArray(['SNX', 'ETH', 'XDR']),
				};
			}

			return pageResults({
				api: graphAPIEndpoints.rates,
				max,
				query: {
					entity: 'rateUpdates',
					selection: {
						orderBy: 'timestamp',
						orderDirection: 'desc',
						where: {
							...synthSelectionQuery,
							block_gte: minBlock || undefined,
							block_lte: maxBlock || undefined,
							timestamp_gte: roundTimestampTenSeconds(minTimestamp) || undefined,
							timestamp_lte: roundTimestampTenSeconds(maxTimestamp) || undefined,
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
						hash: getHashFromId(id),
						rate: rate / 1e18,
					})),
				)
				.catch(err => console.error(err));
		},
		dailyRateChange({ synths = [], max = 100, fromBlock }) {
			const IGNORE_SYNTHS = ['XDR', 'XDRB', 'nUSD', 'sUSD'];
			return pageResults({
				api: graphAPIEndpoints.rates,
				max,
				query: {
					selection: {
						block: {
							number: Number(fromBlock),
						},
					},
					entity: 'latestRates',
					properties: ['id', 'rate'],
				},
			})
				.then(latestRates => {
					const changeValues = latestRates.reduce((acc, curr) => {
						if (
							!IGNORE_SYNTHS.includes(curr.id) &&
							(synths.length === 0 || (synths.length > 0 && synths.includes(curr.id)))
						) {
							acc[curr.id] = {
								currentRate: curr.rate,
							};
						}
						return acc;
					}, {});

					const dayOldBlock = Number(fromBlock) - (24 * 60 * 60) / 15;

					return pageResults({
						api: graphAPIEndpoints.rates,
						max,
						query: {
							selection: {
								block: {
									number: dayOldBlock,
								},
							},
							entity: 'latestRates',
							properties: ['id', 'rate'],
						},
					}).then(dayOldRates => {
						dayOldRates.forEach(dayOldRate => {
							if (changeValues[dayOldRate.id]) {
								changeValues[dayOldRate.id].dayOldRate = dayOldRate.rate;
								changeValues[dayOldRate.id]['24HRChange'] =
									changeValues[dayOldRate.id].currentRate / dayOldRate.rate - 1;
							}
						});

						return changeValues;
					});
				})
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
						hash: getHashFromId(id),
						account,
						timestamp: Number(timestamp * 1000),
						block: Number(block),
						value: value / 1e18,
						type: 'issued',
					})),
				)
				.catch(err => console.error(err));
		},

		dailyIssued({ max = 100, minTimestamp = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'dailyIssueds',
					selection: {
						orderBy: 'id',
						orderDirection: 'desc',
						where: {
							// convert to dayId
							id_gte: minTimestamp ? Math.floor(minTimestamp / 86400) : undefined,
						},
					},
					properties: [
						'id', // the dayId
						'value', // the total issued amount in sUSD on this day
						'totalDebt', // total debt on this day
					],
				},
			})
				.then(results =>
					results.map(({ id, totalDebt, value }) => ({
						hash: getHashFromId(id),
						timestamp: id * 86400,
						value: value / 1e18,
						totalDebt: totalDebt / 1e18,
						type: 'issued',
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
						hash: getHashFromId(id),
						account,
						timestamp: Number(timestamp * 1000),
						block: Number(block),
						value: value / 1e18,
						type: 'burned',
					})),
				)
				.catch(err => console.error(err));
		},

		dailyBurned({ max = 100, minTimestamp = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'dailyBurneds',
					selection: {
						orderBy: 'id',
						orderDirection: 'desc',
						where: {
							// convert to dayId
							id_gte: minTimestamp ? Math.floor(minTimestamp / 86400) : undefined,
						},
					},
					properties: [
						'id', // the dayId
						'value', // the total burned amount in sUSD on this day
						'totalDebt', // total debt on this day
					],
				},
			})
				.then(results =>
					results.map(({ id, totalDebt, value }) => ({
						hash: getHashFromId(id),
						timestamp: id * 86400,
						value: value / 1e18,
						totalDebt: totalDebt / 1e18,
						type: 'burned',
					})),
				)
				.catch(err => console.error(err));
		},

		aggregateActiveStakers({ max = 30 } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'totalDailyActiveStakers',
					selection: {
						orderBy: 'id',
						orderDirection: 'desc',
					},
					properties: ['id', 'count'],
				},
			}).catch(err => console.error(err));
		},

		totalActiveStakers() {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max: 1,
				query: {
					entity: 'totalActiveStakers',
					properties: ['count'],
				},
			})
				.then(([{ count }]) => ({ count }))
				.catch(err => console.error(err));
		},

		holders({
			max = 100,
			maxCollateral = undefined,
			minCollateral = undefined,
			address = undefined,
			minMints = undefined,
			minClaims = undefined,
		} = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'snxholders',
					selection: {
						orderBy: 'collateral',
						orderDirection: 'desc',
						where: {
							id: address ? `\\"${address.toLowerCase()}\\"` : undefined,
							collateral_lte: maxCollateral ? `\\"${maxCollateral + '0'.repeat(18)}\\"` : undefined,
							collateral_gte: minCollateral ? `\\"${minCollateral + '0'.repeat(18)}\\"` : undefined,
							mints_gte: minMints || undefined,
							claims_gte: minClaims || undefined,
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
						'claims', // Total number of claims ever performed
						'mints', // Total number of mints ever performed (issuance of sUSD)
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
							mints,
							claims,
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
							mints: mints !== null ? +mints : 0,
							claims: claims !== null ? +claims : 0,
						}),
					),
				)
				.catch(err => console.error(err));
		},

		rewards({ max = 100, minBalance = undefined, maxBalance = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.snx,
				max,
				query: {
					entity: 'rewardEscrowHolders',
					selection: {
						orderBy: 'balanceOf',
						orderDirection: 'desc',
						where: {
							balanceOf_gte: minBalance ? `\\"${minBalance + '0'.repeat(18)}\\"` : undefined,
							balanceOf_lte: maxBalance ? `\\"${maxBalance + '0'.repeat(18)}\\"` : undefined,
						},
					},
					properties: ['id', 'balanceOf', 'vestedBalanceOf'],
				},
			})
				.then(results =>
					results.map(({ id, balanceOf, vestedBalanceOf }) => ({
						address: id,
						balance: balanceOf / 1e18,
						vestedBalanceOf: vestedBalanceOf / 1e18,
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
						hash: getHashFromId(id),
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
						hash: getHashFromId(id),
						account,
						timestamp: Number(timestamp * 1000),
						block: Number(block),
						value: value / 1e18,
						rewards: rewards / 1e18,
						type: 'feesClaimed',
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
		markets({
			max = 100,
			creator = undefined,
			isOpen = undefined,
			minTimestamp = undefined,
			maxTimestamp = undefined,
		} = {}) {
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
							timestamp_gte: minTimestamp || undefined,
							timestamp_lte: maxTimestamp || undefined,
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
					hash: getHashFromId(id),
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
		loans({ max = Infinity, isOpen = undefined, account = undefined, collateralMinted = undefined } = {}) {
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
							collateralMinted: collateralMinted ? `\\"${collateralMinted}\\"` : undefined,
							isOpen,
						},
					},
					properties: [
						'id',
						'account',
						'amount',
						'isOpen',
						'createdAt',
						'closedAt',
						'txHash',
						'hasPartialLiquidations',
						'collateralMinted',
					],
				},
			})
				.then(results =>
					results.map(
						({
							id,
							account,
							amount,
							isOpen,
							createdAt,
							closedAt,
							txHash,
							hasPartialLiquidations,
							collateralMinted,
						}) => ({
							id: Number(getHashFromId(id)),
							account,
							createdAt: new Date(Number(createdAt * 1000)),
							closedAt: closedAt ? new Date(Number(closedAt * 1000)) : null,
							amount: amount / 1e18,
							isOpen,
							txHash,
							hasPartialLiquidations,
							collateralMinted,
						}),
					),
				)
				.catch(err => console.error(err));
		},
		partiallyLiquidatedLoans({ max = Infinity, account = undefined, loanId = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.etherCollateral,
				max,
				query: {
					entity: 'loanPartiallyLiquidateds',
					selection: {
						where: {
							loanId: loanId ? `\\"${loanId}\\"` : undefined,
							account: account ? `\\"${account}\\"` : undefined,
						},
					},
					properties: ['account', 'liquidatedAmount', 'liquidator', 'liquidatedCollateral', 'loanId', 'id'],
				},
			})
				.then(results =>
					results.map(({ account, liquidatedAmount, liquidator, liquidatedCollateral, loanId, id }) => ({
						loanId: Number(loanId),
						txHash: getHashFromId(id),
						liquidatedCollateral: liquidatedCollateral / 1e18,
						penaltyAmount: (liquidatedCollateral / 1e18) * 0.1,
						liquidator,
						liquidatedAmount: liquidatedAmount / 1e18,
						account,
					})),
				)
				.catch(err => console.error(err));
		},
		liquidatedLoans({ max = Infinity, account = undefined, loanId = undefined } = {}) {
			return pageResults({
				api: graphAPIEndpoints.etherCollateral,
				max,
				query: {
					entity: 'loanLiquidateds',
					selection: {
						where: {
							loanId: loanId ? `\\"${loanId}\\"` : undefined,
							account: account ? `\\"${account}\\"` : undefined,
						},
					},
					properties: ['account', 'liquidator', 'loanId', 'id', 'timestamp'],
				},
			})
				.then(results =>
					results.map(({ account, liquidator, loanId, id, timestamp }) => ({
						loanId: Number(loanId),
						txHash: getHashFromId(id),
						liquidator,
						account,
						timestamp: new Date(Number(timestamp * 1000)),
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
							hash: getHashFromId(id),
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
	liquidations: {
		accountsFlaggedForLiquidation({
			// default check is 3 days from now
			maxTime = Math.round((Date.now() + 86400 * 1000 * 3) / 1000),
			// default check is past twenty seven days
			minTime = Math.round((Date.now() - 86400 * 1000 * 27) / 1000),
			account = undefined,
			max = 5000,
		} = {}) {
			return pageResults({
				api: graphAPIEndpoints.liquidations,
				max,
				query: {
					entity: 'accountFlaggedForLiquidations',
					selection: {
						orderBy: 'deadline',
						orderDirection: 'asc',
						where: {
							account: account ? `\\"${account}\\"` : undefined,
							deadline_gte: roundTimestampTenSeconds(minTime) || undefined,
							deadline_lte: roundTimestampTenSeconds(maxTime) || undefined,
						},
					},
					properties: ['id', 'deadline', 'account', 'collateral', 'collateralRatio', 'liquidatableNonEscrowSNX'],
				},
			}).then(results =>
				results.map(({ id, deadline, account, collateralRatio, liquidatableNonEscrowSNX, collateral }) => ({
					id,
					deadline: Number(deadline * 1000),
					account,
					collateral: collateral / 1e18,
					collateralRatio: collateralRatio / 1e18,
					liquidatableNonEscrowSNX: liquidatableNonEscrowSNX / 1e18,
				})),
			);
		},
		accountsRemovedFromLiquidation({
			maxTime = Math.round(Date.now() / 1000),
			// default check is past thirty days
			minTime = Math.round((Date.now() - 86400 * 1000 * 30) / 1000),
			account = undefined,
			max = 5000,
		} = {}) {
			return pageResults({
				api: graphAPIEndpoints.liquidations,
				max,
				query: {
					entity: 'accountRemovedFromLiquidations',
					selection: {
						orderBy: 'time',
						orderDirection: 'asc',
						where: {
							account: account ? `\\"${account}\\"` : undefined,
							time_gte: roundTimestampTenSeconds(minTime) || undefined,
							time_lte: roundTimestampTenSeconds(maxTime) || undefined,
						},
					},
					properties: ['id', 'time', 'account'],
				},
			}).then(results =>
				results.map(({ id, time, account }) => ({
					id,
					time: Number(time * 1000),
					account,
				})),
			);
		},
		accountsLiquidated({
			maxTime = Math.round(Date.now() / 1000),
			// default check is past thirty days
			minTime = Math.round((Date.now() - 86400 * 1000 * 30) / 1000),
			account = undefined,
			max = 5000,
		} = {}) {
			return pageResults({
				api: graphAPIEndpoints.liquidations,
				max,
				query: {
					entity: 'accountLiquidateds',
					selection: {
						orderBy: 'time',
						orderDirection: 'asc',
						where: {
							account: account ? `\\"${account}\\"` : undefined,
							time_gte: roundTimestampTenSeconds(minTime) || undefined,
							time_lte: roundTimestampTenSeconds(maxTime) || undefined,
						},
					},
					properties: ['id', 'time', 'account', 'liquidator', 'amountLiquidated', 'snxRedeemed'],
				},
			}).then(results =>
				results.map(({ id, time, account, amountLiquidated, snxRedeemed, liquidator }) => ({
					id,
					hash: getHashFromId(id),
					time: Number(time * 1000),
					account,
					liquidator,
					amountLiquidated: amountLiquidated / 1e18,
					snxRedeemed: snxRedeemed / 1e18,
				})),
			);
		},
		getActiveLiquidations({
			maxTime = Math.round(Date.now() / 1000),
			// default check is past thirty days
			minTime = Math.round((Date.now() - 86400 * 1000 * 30) / 1000),
			account = undefined,
			max = 5000,
		} = {}) {
			return this.accountsFlaggedForLiquidation({
				account,
				max,
				maxTime: maxTime + Math.round(86400 * 3),
				minTime: minTime + Math.round(86400 * 3),
			}).then(flaggedResults =>
				this.accountsRemovedFromLiquidation({ account, max, maxTime, minTime }).then(removedResults => {
					return flaggedResults.reduce((acc, curr) => {
						if (removedResults.findIndex(o => o.account === curr.account) === -1) {
							acc.push(curr);
						}
						return acc;
					}, []);
				}),
			);
		},
	},
};
