import * as fs from 'fs';
import axios from 'axios';

interface Feature {
	type: string;
	properties: {
		item_id: string;
		cid: string;
		s3: string;
		filename: string;
		piece_cid: string;
	};
	geometry: {
		type: string;
		coordinates: any[];
	};
}

async function fetchGeoJSONFromURL(url: string): Promise<any> {
	try {
		const response = await axios.get(url);
		return response.data;
	} catch (error) {
		console.error(`Error fetching GeoJSON from URL: ${url}`, error);
		throw error;
	}
}

async function extractAndSaveFeatures(
	input: string,
	outputFile: string,
	isURL: boolean,
	assetName: string
): Promise<void> {
	try {
		let jsonData;

		if (isURL) {
			console.log(`Fetching GeoJSON from URL: ${input}`);
			jsonData = await fetchGeoJSONFromURL(input);
		} else {
			console.log(`Reading GeoJSON from file: ${input}`);
			const rawData = fs.readFileSync(input, 'utf-8');
			jsonData = JSON.parse(rawData);
		}

		// Extract and reformat features
		const features = jsonData.features.map((feature: any) => {
			const item_id = feature.id;

			// This accounts for the GEDI dataset where the asset name also includes part of the filename
			// This is a hacky workaround to get the correct asset name
			if (assetName.includes('gov/protected/')) {
				const assetKey =
					Object.keys(feature.assets).find((key) => key.includes(assetName)) || assetName;
				assetName = assetKey;
			}

			const s3 = feature.assets?.[assetName]?.alternate?.S3?.href || '';
			// const s3 = feature.assets?.[assetName]?.alternate?.s3?.href || '';
			const filename = s3.split('/').pop() || '';
			const cid = feature.assets?.[assetName]?.alternate?.ipfs?.cid || '';
			const piece_cid = feature.assets?.[assetName]?.alternate?.filecoin?.piece_cid || '';

			return {
				type: 'Feature',
				properties: {
					item_id: item_id,
					PATH: parseInt(feature.properties['landsat:wrs_path'] || '0', 10),
					ROW: parseInt(feature.properties['landsat:wrs_row'] || '0', 10),
					cid: cid,
					datetime: feature.properties.datetime || '',
					s3: s3,
					filename: filename,
					piece_cid: piece_cid
				},
				geometry: feature.geometry
			} as Feature;
		});

		// Create the new GeoJSON object
		const geojson = {
			type: 'FeatureCollection',
			features: features
		};

		// Write the new GeoJSON to the output file
		fs.writeFileSync(outputFile, JSON.stringify(geojson, null, 2));
		console.log(`GeoJSON saved to ${outputFile}`);
	} catch (error) {
		console.error('Error processing features:', error);
	}
}

// Input and output file paths or URL
const input = process.argv[2]; // Pass the input (file path or URL) as the first argument
const outputFile = process.argv[3]; // Pass the output file path as the second argument
const isURL = process.argv[4] === 'url'; // Pass 'url' as the third argument to indicate input is a URL
const assetName = process.argv[5]; // Pass the asset name as the fourth argument

// Run the extraction and save process
extractAndSaveFeatures(input, outputFile, isURL, assetName);
