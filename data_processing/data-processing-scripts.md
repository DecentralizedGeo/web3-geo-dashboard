# GeoJSON Feature Extraction and Mapping Documentation

This document provides an overview of the scripts used for extracting GeoJSON features from a STAC endpoint, reformatting them, and saving them to a new GeoJSON file. It also includes instructions on how to run the scripts and the expected output. The geojson files is referenced in in `map.svelte` as to load the data into the map to be displayed.

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

   > **Note**: If the input is a URL, you must at least pass in the 'collections' url param. You can also pass in other params such as 'bbox', 'datetime', and 'limit'.

2. `<outputFile>`: The name of the output file where the extracted features will be saved.
3. `<isURL>`: A boolean value indicating whether the input is a URL (true) or a file path (false).
4. `<assetName>`: The name of the asset to grab from the item. This is required.

**Examples**:

This example is using the url params `collections`, `bbox`, `datetime`, and `limit` to filter the data.

```bash
ts-node extract_features.ts "https://stac.easierdata.info/api/v1/pgstac/search?collections=landsat-c2l1&bbox=-128.62125141604434,24.5271348225978,-63.93375141604433,52.482780222078226&limit=1000&datetime=2022-10-01T00:00:00.000Z/2022-11-30T00:00:00.000Z" ./landsat-demo-features.geojson url
```

This example is using the url params `collections`, `bbox`, and `limit` to filter the data. Since this is pulling items from the GEDI collections, I've passed in "gov/protected/" as the asset name. Each item in the GEDI collection has a different asset name, so this is a catch-all for all of the items in the collection.

```bash
ts-node extract_features.ts "https://stac.easierdata.info/api/v1/pgstac/search?collections=GEDI_L4A_AGB_Density_V2_1_2056.v2.1&limit=100" ./output-demo-features.geojson url "gov/protected/"
```

```bash
ts-node extract_features.ts "https://stac.easierdata.info/api/v1/pgstac/search?collections=GEDI_L4A_AGB_Density_V2_1_2056.v2.1&bbox=-128.62125141604434,24.5271348225978,-63.93375141604433,52.482780222078226" ./output-demo-features.geojson url "gov/protected/
```

This example is using not using any url params, so the number of items returned defaults to 10. The asset name is "B02" which is the name of the asset in the HLS collection.

```bash
ts-node extract_features.ts "https://stac.easierdata.info/api/v1/pgstac/search?collections=HLSS30_2.0" ./hls-demo-features.geojson url "B02"
```

### Key Updates

The properties object now includes:

- `piece_cid`: The CID that represents the filecoin piece. This is different than the `cid` property.
- `cid`: The CID of the file. This value is the same in the `Filecoin` and `IPFS` alternate assets.
- `item_id`: The ID of the item.

### Testing out the exported geojson file

To test out the exported geojson file, commit the file to the repo. Once the file is committed, grab the `raw.githubusercontent` link to the file and paste it into the map via the `GeoJSON URL` input when the map is initially loaded.
