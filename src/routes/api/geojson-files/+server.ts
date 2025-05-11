import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const geoJsonFiles = [
			'GEDI_L4A_AGB_Density_V2_1_2056.v2.1-gov_protected.geojson',
			'HLSS30_2.0-B02.geojson',
			'HLSS30_2.0-B03.geojson',
			'HLSS30_2.0-B04.geojson',
			'HLSS30_2.0-B11.geojson',
			'HLSS30_2.0-B12.geojson',
			'HLSS30_2.0-B8A.geojson',
			'HLSS30_2.0-Fmask.geojson',
			'landsat-c2l1-ANG.txt.geojson',
			'landsat-c2l1-blue.geojson',
			'landsat-c2l1-cirrus.geojson',
			'landsat-c2l1-coastal.geojson',
			'landsat-c2l1-green.geojson',
			'landsat-c2l1-lwir11.geojson',
			'landsat-c2l1-lwir12.geojson',
			'landsat-c2l1-MTL.json.geojson',
			'landsat-c2l1-MTL.txt.geojson',
			'landsat-c2l1-MTL.xml.geojson',
			'landsat-c2l1-nir08.geojson',
			'landsat-c2l1-pan.geojson',
			'landsat-c2l1-qa_pixel.geojson',
			'landsat-c2l1-qa_radsat.geojson',
			'landsat-c2l1-red.geojson',
			'landsat-c2l1-reduced_resolution_browse.geojson',
			'landsat-c2l1-SAA.geojson',
			'landsat-c2l1-swir16.geojson',
			'landsat-c2l1-swir22.geojson',
			'landsat-c2l1-SZA.geojson',
			'landsat-c2l1-thumbnail.geojson',
			'landsat-c2l1-VAA.geojson',
			'landsat-c2l1-VZA.geojson'
		].map((filename) => ({
			value: `/data_processing/demo-layers/${filename}.geojson`,
			label: filename
		}));

		return json(geoJsonFiles);
	} catch (error) {
		console.error('Error reading GeoJSON files:', error);
		return json([], { status: 500 });
	}
}
