/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * Credits:
 *
 * code is refactored from https://github.com/willscott/cid.contact/tree/cd64dc5b0f2d56d9f232814fa066257a5fe2e506
 */

import axios from 'axios';
import CBOR from 'cbor';
import { metadata } from '../types';

export class Metadata {
	MSB: number;
	REST: number;

	constructor() {
		this.MSB = 0x80;
		this.REST = 0x7f;
	}

	// @ts-ignore
	readVarint(buf: any, offset: any) {
		const res = 0, // @ts-ignore
			offset = offset || 0,
			shift = 0,
			counter = offset, // @ts-ignore
			b,
			l = buf.length;

		do {
			if (counter >= l || shift > 49) {
				// @ts-ignore
				this.readVarint.bytes = 0;
				throw new RangeError('Could not decode varint');
			} // @ts-ignore
			b = buf[counter++]; // @ts-ignore
			res += shift < 28 ? (b & this.REST) << shift : (b & this.REST) * Math.pow(2, shift); // @ts-ignore
			shift += 7;
		} while (b >= this.MSB);

		//@ts-ignore
		this.readVarint.bytes = counter - offset;

		return res;
	}

	joinPath(a: string | any[], b: any) {
		return (a[a.length - 1] === '/' ? a : a + '/') + b;
	}

	async onSearch(sb: string): Promise<metadata> {
		const ipfs = 0;
		let filecoin = 0;
		let unsealed = 0;
		//@ts-ignore
		if (sb == '') {
			sb = 'bafybeigvgzoolc3drupxhlevdp2ugqcrbcsqfmcek2zxiw5wctk3xjpjwy';
		}

		try {
			const response = await axios(`http://cid.contact/cid/${sb}`);

			const res = response.data.MultihashResults[0];

			const providers = {};
			for (let i = 0; i < res.ProviderResults.length; i++) {
				const provider = res.ProviderResults[i];
				//@ts-ignore
				if (providers[provider.Provider.ID] == undefined) {
					//@ts-ignore
					providers[provider.Provider.ID] = {};
				}
				//@ts-ignore
				providers[provider.Provider.ID][provider.ContextID] = provider;
			}
			const pids = Object.keys(providers);
			for (let i = 0; i < pids.length; i++) {
				//@ts-ignore
				const pd = providers[pids[i]];
				let addrs = '';
				const keys = {};
				const contexts = Object.keys(pd);
				for (let j = 0; j < contexts.length; j++) {
					let mdBytes = this.base64ToBytesArr(pd[contexts[j]].Metadata);
					while (mdBytes.length > 0) {
						const next = this.popProtocol(mdBytes);
						const name = next[0];
						//@ts-ignore
						mdBytes = next[1];

						//@ts-ignore
						const ctx = this.toContext(name, mdBytes);
						//@ts-ignore
						if (keys[name] == undefined) {
							//@ts-ignore
							keys[name] = [];
						}
						if (ctx[0] != '') {
							//@ts-ignore
							keys[name].push(ctx[0]);
							// @ts-ignore
							if (ctx[0].includes('Unsealed')) unsealed++;
						}
						//@ts-ignore
						mdBytes = ctx[1];
						addrs = pd[contexts[j]].Provider.Addrs;
					}
				}
			}
			// Provider ids = filecoin
			// ipfs = WIP
			// unsealed = # of unsealed deals
			filecoin = pids.length;

			return {
				ipfs,
				filecoin,
				unsealed,
				Providers: pids || []
			};
		} catch (e: any) {
			console.log(`Error fetching CID information: ${e}`);

			return {
				ipfs,
				filecoin,
				unsealed,
				Providers: []
			};
		}
	}

	popProtocol(buf: string | any[]) {
		const code = this.readVarint(buf, 0);
		// @ts-ignore
		buf = buf.slice(this.readVarint.bytes);

		if (code == 0x900) {
			return ['Bitswap', buf];
		} else if (code == 0x910 || code == 4128768) {
			return ['Graphsync', buf];
		} else {
			return [code, buf];
		}
	}

	toContext(code: string, buf: Iterable<number>) {
		if (code == 'Graphsync') {
			try {
				const cbor = CBOR.decode(Uint8Array.from(buf).buffer);
				//const cid = window.b2c(Uint8Array.from(cbor.PieceCID).subarray(1))
				let str = 'In piece ';
				if (cbor.VerifiedDeal) {
					str += ' (Stored as verified data)';
				}
				if (cbor.FastRetrieval) {
					str += ' (Unsealed copy available)';
				}
				return [str, Uint8Array.from([])];
			} catch (e) {
				return ['Non-CBOR Context:' + e, buf];
			}
		}
		return ['', buf];
	}

	base64ToBytesArr(str: string | any[]) {
		const abc = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'];

		const result = [];
		for (let i = 0; i < str.length / 4; i++) {
			const chunk = [...str.slice(4 * i, 4 * i + 4)];
			//@ts-ignore
			const bin = chunk.map((x) => abc.indexOf(x).toString(2).padStart(6, 0)).join('');
			//@ts-ignore
			const bytes = bin.match(/.{1,8}/g).map((x) => +('0b' + x));
			//@ts-ignore
			result.push(...bytes.slice(0, 3 - (str[4 * i + 2] == '=') - (str[4 * i + 3] == '=')));
		}
		return result;
	}
}
