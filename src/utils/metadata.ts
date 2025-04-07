import axios from 'axios';

export interface metadata {
	ipfs: number; // number of IPFS nodes that pin CID
	filecoin: number; // Number of Filecoin deals
	Providers: any[]; // List of providers
	cids: cidObject; // CIDs for the Landsat scene
}

interface cidObject {
	filecoin: string;
	datetime: string;
	s3: string;
	ipfs: string;
	piece: string;
	root: string;
}

/**
 * Wraps around utility functions to return metadata object
 *
 * @param {number} path - The path of the Landsat scene
 * @param {number} row - The row of the Landsat scene
 * @param {string} stacURL - The URL of the STAC API
 * @returns {Promise<metadata>} - A promise that resolves to a metadata object
 */
export async function retrieveMetadata(
	path: string,
	row: string,
	stacURL: string
): Promise<metadata> {
	const metadata: metadata = {
		ipfs: 0,
		filecoin: 0,
		Providers: [],
		cids: {
			filecoin: '',
			datetime: '',
			s3: '',
			ipfs: '',
			piece: '',
			root: ''
		}
	};

	// Fetch the CIDs for the Landsat scene
	const cids = await fetchCIDs(path, row, stacURL);
	const deals = await fetchDeals(cids.filecoin);

	metadata.filecoin = deals;
	metadata.cids = cids;

	return metadata;
}

/**
 * Fetch the IPFS and Filecoin CIDs for a given Landsat scene.
 *
 * @param {number} path path of the Landsat scene
 * @param {number} row the row of the Landsat scene
 * @param {string} stacURL the URL of the STAC API
 * @returns
 */
async function fetchCIDs(path: string, row: string, stacURL: string): Promise<cidObject> {
	const response = await axios({
		method: 'post',
		url: `${stacURL}/api/v1/pgstac/search`,
		headers: {
			'Content-Type': 'application/json'
		},
		data: {
			collections: ['landsat-c2l1'],
			query: {
				'landsat:wrs_row': {
					eq: `0${row}`
				},
				'landsat:wrs_path': {
					eq: `0${path}`
				}
			}
		}
	});

	try {
		const cid = response.data.features[0].assets.SAA.alternate;
		console.log(cid);
		return {
			filecoin: cid.filecoin.cid,
			datetime: response.data.features[0].properties.datetime,
			s3: cid['s3'].href,
			ipfs: cid.ipfs.cid,
			piece: cid.filecoin.piece_cid,
			root: cid.filecoin.root_cid
		};
	} catch (error) {
		console.log(error);
		console.error('CID Not found');
		return {
			filecoin: '',
			datetime: '',
			s3: '',
			ipfs: '',
			piece: '',
			root: ''
		};
	}
}

/**
 * Fetch the number of deals
 *
 * @param {string} cid - The CID to fetch the deal information for
 * @returns {Promise<number>} - A promise tthat resolves to the number of deals
 */
async function fetchDeals(cid: string) {
	try {
		const response = await axios.get(
			`https://api.filecoin.tools/api/search?page=1&limit=10&filter=${cid}`,
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);

		if (response.status == 200) {
			return response.data.data.length;
		} else {
			return 0;
		}
	} catch (error) {
		console.error('Error fetching deals:', error);
		return 0;
	}
}
