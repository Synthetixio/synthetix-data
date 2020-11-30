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

const roundTimestampTenSeconds = timestamp => Math.round(timestamp / 10) * 10;

const getHashFromId = id => id.split('-')[0];

const formatGQLArray = arr => '[' + arr.map(code => `\\"${code}\\"`).join(',') + ']';

const formatGQLString = str => `\\"${str}\\"`;

module.exports = {
	ZERO_ADDRESS,
	hexToAscii,
	roundTimestampTenSeconds,
	getHashFromId,
	formatGQLArray,
	formatGQLString,
};
