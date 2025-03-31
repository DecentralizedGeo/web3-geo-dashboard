import axios from 'axios';

const root_stac_url = 'https://stac.easierdata.info';

async function main(): Promise<void> {
	const collections = await axios.get(`${root_stac_url}/collections`, {
		headers: {
			'Content-Type': 'application/json'
		}
	});

	console.log(collections.data);
}

main();
