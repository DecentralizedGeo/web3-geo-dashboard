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

export async function extractAndSaveFeatures(
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
		const features = jsonData.features
			.map((feature: any) => {
				const item_id = feature.id;

				if (feature.collection.includes('GEDI')) {
					// Find the asset key that contains 'gov/protected/'
					const assetKey = Object.keys(feature.assets).find(
						(key) => key.includes('gov/protected/')
						// console.log(`Found asset key: ${key} for feature with ID: ${item_id}`);
					);

					if (!assetKey) {
						console.warn(`No 'gov/protected/' asset found for feature with ID: ${item_id}`);
						return null; // Skip this feature if no matching asset is found
					}
					// console.log(`Found asset key: ${assetKey} for feature with ID}`);
					assetName = assetKey; // Use the found asset key
				}

				const s3 = feature.assets?.[assetName]?.alternate?.s3?.href || '';
				const filename = s3.split('/').pop() || '';
				const cid = feature.assets?.[assetName]?.alternate?.ipfs?.cid || '';
				const piece_cid = feature.assets?.[assetName]?.alternate?.filecoin?.piece_cid || '';

				// Create a properties object and add each of the consts from above into it
				const feat_properties = {
					item_id: item_id,
					cid: cid,
					s3: s3,
					filename: filename,
					piece_cid: piece_cid,
					datetime: feature.properties.datetime || ''
				};

				// Grab the collections properties from the features
				if (feature.collection === 'landsat-c2l1') {
					feat_properties['PATH'] = parseInt(feature.properties['landsat:wrs_path'] || '0', 10);
					feat_properties['ROW'] = parseInt(feature.properties['landsat:wrs_row'] || '0', 10);
				}

				// Create the new feature object
				return {
					type: 'Feature',
					properties: feat_properties,
					geometry: feature.geometry
				} as Feature;
			})
			.filter((feature) => feature !== null); // Filter out null features

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
