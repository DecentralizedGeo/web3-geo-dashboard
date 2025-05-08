import axios from 'axios';

interface Geocode {
	path: string;
	row: string;
}

export async function geocodeQuery(address: string): Promise<Geocode> {
	const response = await axios(
		`https://maps.googleapis.com/maps/api/geocode/json?address=${address.replace(
			/ /g,
			'%20'
		)}&key=${import.meta.env.VITE_GOOGLEAPIKEY}`,
		{
			headers: {
				'content-type': 'application/json'
			}
		}
	);
	const result = response.data.results;

	const query = await axios(
		`https://api.mapbox.com/v4/mnanas2004.alx6bsr0/tilequery/${result[0].geometry.location.lng},${
			result[0].geometry.location.lat
		}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&layers=${
			import.meta.env.VITE_MAPBOX_LAYER
		}&geometry=polygon`
	);

	return {
		path: query.data.features[0].properties.PATH,
		row: query.data.features[0].properties.ROW
	};
}
