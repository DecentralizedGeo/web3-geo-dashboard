# GeoJSON Feature Extraction and Mapping Documentation

This document provides an overview of the scripts used for extracting GeoJSON features from a STAC endpoint, reformatting them, and saving them to a new GeoJSON file. It also includes instructions on how to run the scripts and the expected output. The GeoJSON files are referenced in `map.svelte` to load the data into the map for display.

> Note: In order to run the scripts, you will need to run them from the `data_processing` directory.

---

## 1. How to Use the Updated Code

### Feature Extraction Script (`extract_features.ts`)

#### Purpose

This script extracts GeoJSON features from a file or URL, reformats them, and saves them to a new GeoJSON file.

#### Usage

Run the script using the following command:

```bash
node extract_features.js <input> <outputFile> <isURL> <assetName>
```

#### Parameters

1. `<input>`: The input file or URL to a STAC endpoint with URL params.

   > **Note**: If the input is a URL, you must at least pass in the 'collections' URL param. You can also pass in other params such as 'bbox', 'datetime', and 'limit'.

2. `<outputFile>`: The name of the output file where the extracted features will be saved.
3. `<isURL>`: A boolean value indicating whether the input is a URL (`true`) or a file path (`false`).
4. `<assetName>`: The name of the asset to grab from the item. This is required.

**Examples**:

This example is using the url params `collections`, `bbox`, `datetime`, and `limit` to filter the data.

```bash
ts-node extract_features.ts "https://stac.easierdata.info/api/v1/pgstac/search?collections=landsat-c2l1&bbox=-128.62125141604434,24.5271348225978,-63.93375141604433,52.482780222078226&limit=1000&datetime=2022-10-01T00:00:00.000Z/2022-11-30T00:00:00.000Z" ./landsat-demo-features.geojson url
```

This example is using the url params `collections`, `bbox`, and `limit` to filter the data. Since this is pulling items from the GEDI collections, I've passed in "gov/protected/" as the asset name. Each item in the GEDI collection has a different asset name, so this is a catch-all for all of the items in the collection.

```bash
ts-node extract_features.ts "https://stac.easierdata.info/api/v1/pgstac/search?collections=GEDI_L4A_AGB_Density_V2_1_2056.v2.1&bbox=-128.62125141604434,24.5271348225978,-63.93375141604433,52.482780222078226" ./output-demo-features.geojson url "gov/protected/
```

This example is using not using any url params, so the number of items returned defaults to 10. The asset name is "B02" which is the name of the asset in the HLS collection.

```bash
ts-node extract_features.ts "https://stac.easierdata.info/api/v1/pgstac/search?collections=HLSS30_2.0" ./hls-demo-features.geojson url "B02"
```

---

### GeoJSON Generation Script (`generate_geojson.ts`)

#### Purpose

The `generate_geojson.ts` script automates the process of generating GeoJSON files for multiple collections and their associated assets from a STAC endpoint. It queries the endpoint, identifies valid assets for each collection, and generates GeoJSON files for each collection-asset combination.

#### What It Does

1. **Queries the STAC Endpoint**:

   - Fetches the first item from each collection to identify available assets.
   - Filters assets to include only those with `ipfs` and `filecoin` in the `alternate` key.

2. **Generates GeoJSON Files**:

   - Loops through the collections and their valid assets.
   - Calls the `extractAndSaveFeatures` function to generate GeoJSON files for each collection-asset pair.

3. **Saves Output**:
   - Saves the generated GeoJSON files in the `./output` directory.

#### Usage

Run the script using the following command:

```bash
ts-node generate_geojson.ts
```

#### Configuration

You can modify the following constants in the script to customize the query:

- **`collections`**: A list of collection IDs to process.

  ```typescript
  const collections = ['landsat-c2l1', 'GEDI_L4A_AGB_Density_V2_1_2056.v2.1', 'HLSS30_2.0'];
  ```

- **`SEARCH_LIMIT`**: The maximum number of items to fetch per collection.

  ```typescript
  const SEARCH_LIMIT = '1000';
  ```

- **`BBOX`**: The bounding box for filtering items.

  ```typescript
  const BBOX = '-128.62125141604434,24.5271348225978,-63.93375141604433,52.482780222078226';
  ```

- **`DATETIME`**: The date range for filtering items.

  ```typescript
  const DATETIME = '2022-10-01T00:00:00.000Z/2022-11-30T00:00:00.000Z';
  ```

#### Example Output

For the following collections:

```json
{
	"landsat-c2l1": ["asset1", "asset2"],
	"GEDI_L4A_AGB_Density_V2_1_2056.v2.1": ["asset3"],
	"HLSS30_2.0": ["asset4", "asset5"]
}
```

The script will generate files like:

- `./output/landsat-c2l1-asset1.geojson`
- `./output/landsat-c2l1-asset2.geojson`
- `./output/GEDI_L4A_AGB_Density_V2_1_2056.v2.1-asset3.geojson`
- `./output/HLSS30_2.0-asset4.geojson`
- `./output/HLSS30_2.0-asset5.geojson`

#### Notes

- Ensure the `extract_features.ts` file is in the same directory or adjust the import path accordingly.
- The script assumes the STAC endpoint is accessible and returns valid data.
- You may need to install dependencies like `axios` if not already installed:

  ```bash
  npm install axios
  ```

---

### Key Updates

The properties object now includes:

- `piece_cid`: The CID that represents the Filecoin piece. This is different from the `cid` property.
- `cid`: The CID of the file. This value is the same in the `Filecoin` and `IPFS` alternate assets.
- `item_id`: The ID of the item.

---

### Testing the Exported GeoJSON Files

To test the exported GeoJSON files:

1. Commit the files to the repository.
2. Grab the `raw.githubusercontent` link to the file.
3. Paste the link into the map via the `GeoJSON URL` input when the map is initially loaded.
