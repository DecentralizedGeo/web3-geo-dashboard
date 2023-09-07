import * as fs from 'fs';
import axios from 'axios';

async function main(): Promise<void> {
	const raw: string = fs.readFileSync(
		'./landsat_scenes_intersecting_continential_us.geojson',
		'utf-8'
	);
	const geojson = JSON.parse(raw);
	const newGeo = geojson;

	for (let x = 0; x < geojson.features.length; x++) {
		console.log(x);
		const feature = geojson.features[x];

		const cid = await getCID(feature.properties.PATH, feature.properties.ROW);

		if (cid != null) {
			console.log(cid[0]);
			newGeo.features[x]['properties']['cid'] = cid[0];
			newGeo.features[x]['properties']['datetime'] = cid[1];
			newGeo.features[x]['properties']['s3'] = cid[2];
			newGeo.features[x]['properties']['filename'] =
				cid[2].split('/')[cid[2].split('/').length - 1];
		}
	}

	fs.writeFileSync('cid_enriched.geojson', JSON.stringify(newGeo, null, '\t'), 'utf-8');
}

async function getCID(path: number, row: number): Promise<string[] | null> {
	const response = await axios.get(
		`http://ec2-54-172-212-55.compute-1.amazonaws.com/api/v1/pgstac/search?collections=landsat-c2l1&query={"landsat:wrs_row":{"eq":"0${row}"}}&query={"landsat:wrs_path":{"eq":"0${path}"}}`,
		{
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);

	try {
		return [
			response.data.features[0].assets.SAA.alternate.IPFS.href.split('/')[2],
			response.data.features[0].properties.datetime,
			response.data.features[0].assets.SAA.alternate['s3'].href
		];
	} catch {
		console.log('CID Not found');
		return null;
	}
}

main();
