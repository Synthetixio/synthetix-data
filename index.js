// UMD wrapper to support both nodejs (8+) and modern browser (with fetch) (no AMD)
// UMD via https://github.com/umdjs/umd/blob/master/templates/returnExportsGlobal.js
(function(root, factory) {
	/* eslint-disable-next-line no-undef */
	if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory(require('node-fetch'));
	} else {
		// Browser globals
		root.snxData = factory(root.fetch);
	}
	/* eslint-disable-next-line no-undef */
})(typeof self !== 'undefined' ? self : this, function(fetch) {
	'use strict';

	const graphAPIEndpoints = {
		snx: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix',
		depot: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-depot',
		exchanges: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-exchanges',
		rates: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-rates',
	};

	const ZERO_ADDRESS = '0x' + '0'.repeat(40);
	const MAX_PAGE_SIZE = 1000; // The Graph max page size

	/**
	 * Page results from The Graph protocol
	 *
	 * @param {string} api - The API address
	 * @param {Object} query - The Query object
	 * @param {string} query.entity - The entity name
	 * @param {Object} query.selection - The selection mapping object for GraphQL filters and sorts
	 * @param {Object} query.properties - The list of fields to include in the output
	 * @param {number} max - Maximum number of results to return (default: Infinity)
	 */
	const pageResults = ({ api, query: { entity, selection = {}, properties = [] }, max = Infinity }) => {
		max = Number(max);
		const pageSize = MAX_PAGE_SIZE;

		// Note: this approach will call each page in linear order, ensuring it stops as soon as all results
		// are fetched. This could be sped up with a number of requests done in parallel, stopping as soon as any return
		// empty. - JJM
		const runner = ({ skip }) => {
			const propToString = obj =>
				Object.entries(obj)
					.filter(([, value]) => typeof value !== 'undefined')
					.map(([key, value]) => `${key}:${typeof value === 'object' ? '{' + propToString(value) + '}' : value}`)
					.join(',');

			const first = skip + pageSize > max ? max % pageSize : pageSize;

			// mix the page size and skip fields into the selection object
			const selectionObj = Object.assign({}, selection, {
				first,
				skip,
			});

			const body = `{"query":"{${entity}(${propToString(selectionObj)}){${properties.join(',')}}}", "variables": null}`;

			return fetch(api, {
				method: 'POST',
				body,
			})
				.then(response => response.json())
				.then(json => {
					if (json.errors) {
						throw Error(JSON.stringify(json.errors));
					}
					const {
						data: { [entity]: results },
					} = json;

					// stop if we are on the last page or if
					if (results.length < pageSize || Math.min(max, skip + results.length) >= max) {
						return results;
					}

					return runner({ skip: skip + pageSize }).then(newResults => results.concat(newResults));
				});
		};

		return runner({ skip: 0 });
	};

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

	return {
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
			 * Get all exchanges since some timestamp in seconds (ordered reverse chronological)
			 */
			since({
				network = 'mainnet',
				timestampInSecs = Math.floor(Date.now() / 1e3) - 3600 * 24 /* default is 1 day ago */,
			} = {}) {
				return pageResults({
					api: graphAPIEndpoints.exchanges,
					query: {
						entity: 'synthExchanges',
						selection: {
							orderBy: 'timestamp',
							orderDirection: 'desc',
							where: {
								network: `\\"${network}\\"`,
								timestamp_gt: timestampInSecs,
							},
						},
						properties: [
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
					},
				})
					.then(results =>
						results.map(
							({
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
						),
					)
					.catch(err => console.error(err));
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
			transfers({ synth = undefined, from = undefined, to = undefined, max = 100 } = {}) {
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
		rates: {
			/**
			 * Get the last max RateUpdate events for the given synth in reverse order
			 */
			updateForSynth({ synth, max = 100 } = {}) {
				return pageResults({
					api: graphAPIEndpoints.rates,
					max,
					query: {
						entity: 'rateUpdates',
						selection: {
							orderBy: 'timestamp',
							orderDirection: 'desc',
							where: {
								synth: `\\"${synth}\\"`,
							},
						},
						properties: ['id', 'rate', 'block', 'timestamp'],
					},
				})
					.then(results =>
						results.map(({ id, rate, block, timestamp }) => ({
							block: Number(block),
							timestamp: Number(timestamp * 1000),
							date: new Date(timestamp * 1000),
							hash: id.split('-')[0],
							rate: rate / 1e18,
						})),
					)
					.catch(err => console.error(err));
			},
		},
		snx: {
			holders({ max = 100 } = {}) {
				return pageResults({
					api: graphAPIEndpoints.snx,
					max,
					query: {
						entity: 'snxholders',
						properties: ['id'],
					},
				})
					.then(results => results.map(({ id }) => id))
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
			transfers({ from = undefined, to = undefined, max = 100 } = {}) {
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
});
