import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

export async function GET() {
	try {
		const directoryPath = path.resolve('data_processing/demo-layers');
		const files = fs.readdirSync(directoryPath);

		const geoJsonFiles = files
			.filter((file) => file.endsWith('.geojson'))
			.map((file) => ({
				value: `/data_processing/demo-layers/${file}`,
				label: file.replace('.geojson', '')
			}));

		return json(geoJsonFiles);
	} catch (error) {
		console.error('Error reading GeoJSON files:', error);
		return json([], { status: 500 });
	}
}
