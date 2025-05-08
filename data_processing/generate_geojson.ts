import axios from 'axios';
import * as fs from 'fs';
import { extractAndSaveFeatures } from './extract_features.ts'; // Import the existing function

const stacEndpoint = 'https://stac.easierdata.info/api/v1/pgstac/search';
// const collections = ['landsat-c2l1', 'GEDI_L4A_AGB_Density_V2_1_2056.v2.1', 'HLSS30_2.0'];
const collections = ['landsat-c2l1'];
// const collections = ['GEDI_L4A_AGB_Density_V2_1_2056.v2.1', 'HLSS30_2.0'];

// Set the following to modify the URL parameters
const SEARCH_LIMIT = '1000'; // Set the limit for the number of items to fetch
const BBOX = '-128.62125141604434,24.5271348225978,-63.93375141604433,52.482780222078226'; // Example bounding box
const DATETIME = '';

async function getAssetsForCollections(): Promise<Record<string, string[]>> {
	const collectionAssets: Record<string, string[]> = {};

	for (const collection of collections) {
		try {
			console.log(`Fetching assets for collection: ${collection}`);
			const response = await axios.get(`${stacEndpoint}?collections=${collection}&limit=1`);
			const items = response.data.features;

			if (items.length === 0) {
				console.warn(`No items found for collection: ${collection}`);
				continue;
			}

			const firstItem = items[0];
			const assets = Object.keys(firstItem.assets);

			// Filter and update assets that contain both `ipfs` and `filecoin` in the `alternate` key
			const validAssets = assets
				.map((assetKey) => {
					// Check if assetKey includes 'gov/protected/gedi/' and rename it to 'gov/protected/'
					if (assetKey.includes('gov/protected/')) {
						const newAssetKey = 'gov/protected/';
						firstItem.assets[newAssetKey] = firstItem.assets[assetKey]; // Update the key in the assets object
						delete firstItem.assets[assetKey]; // Remove the old key
						return newAssetKey; // Return the updated key
					}
					return assetKey; // Return the original key if no update is needed
				})
				.filter((assetKey) => {
					const asset = firstItem.assets[assetKey];
					return asset.alternate && asset.alternate.ipfs && asset.alternate.filecoin;
				});

			if (validAssets.length > 0) {
				collectionAssets[collection] = validAssets;
				console.log(`Valid assets for collection ${collection}: ${validAssets}`);
			} else {
				console.warn(`No valid assets found for collection: ${collection}`);
			}
		} catch (error) {
			console.error(`Error fetching assets for collection ${collection}:`, error);
		}
	}

	return collectionAssets;
}

async function generateGeoJSONFiles(collectionAssets: Record<string, string[]>): Promise<void> {
	for (const [collection, assets] of Object.entries(collectionAssets)) {
		for (const asset of assets) {
			// The following is quick fix that only impacts the GEDI collection
			// remove trailing slash from the end of the asset name and replace '/' with '_' if it exists
			const sanitizedAssetName = asset.replace(/\/$/, '').replace(/\//g, '_');
			const outputFileName = `./output/${collection}-${sanitizedAssetName}.geojson`;

			// create url string along with the collection name, asset name and url params
			const url = new URL(stacEndpoint);
			url.searchParams.append('collections', collection);

			// Extra URL parameters for filtering
			if (SEARCH_LIMIT) {
				url.searchParams.append('limit', SEARCH_LIMIT);
			}
			if (BBOX) {
				url.searchParams.append('bbox', BBOX);
			}
			if (DATETIME) {
				url.searchParams.append('datetime', DATETIME);
			}

			console.log(`Generating GeoJSON for collection: ${collection}, asset: ${asset}`);
			try {
				await extractAndSaveFeatures(url.toString(), outputFileName, true, asset);
				console.log(`GeoJSON saved to ${outputFileName}`);
			} catch (error) {
				console.error(`Error generating GeoJSON for ${collection} - ${asset}:`, error);
			}
		}
	}
}

async function main() {
	try {
		const collectionAssets = await getAssetsForCollections();
		console.log('Final collection-assets mapping:', collectionAssets);

		// Ensure the output directory exists
		if (!fs.existsSync('./output')) {
			fs.mkdirSync('./output');
		}

		await generateGeoJSONFiles(collectionAssets);
	} catch (error) {
		console.error('Error in main process:', error);
	}
}

main();
