<script lang="ts">
	import { Loader } from '@googlemaps/js-api-loader';
	import mapboxgl, { Map } from 'mapbox-gl';
	import { ethers } from 'ethers';
	import { onMount, onDestroy } from 'svelte';
	import type { Web3EnrichedMapboxFeature, RequestRedirect, RequestInit } from '../types';
	// @ts-ignore
	import Modal from './modal.svelte'; // @ts-ignore
	import AddLayer from './components/addLayer.svelte';
	import Sidebar from './components/sidebar.svelte'; // @ts-ignore
	import Accordion from './accordion.svelte';
	import Searchbar from './components/searchbar.svelte';
	import Veda from './components/veda.svelte';
	import { geocodeQuery } from '../utils/geocode';
	import SwapLayer from './components/swapLayer.svelte';

	let showModal = false;
	let showVeda = false;

	// Add layer modal values
	let showAddLayer = false;
	let addStac = '';

	let stac_api_layers: any[] = [];

	let cid = '';
	let stac_endpoint = 'https://stac.easierdata.info';
	let geojson_endpoint =
		'https://raw.githubusercontent.com/DecentralizedGeo/web3-geo-dashboard/api-refactor/data_processing/demo-layers/HLSS30_2.0-B02.geojson';
	// 	'https://raw.githubusercontent.com/easierdata/web3-geo-dashboard/api-refactor/data_processing/cid_enriched.geojson';
	// let geojson_endpoint =
	// 	'https://raw.githubusercontent.com/DecentralizedGeo/web3-geo-dashboard/main/data_processing/demo-layers/HLSS30_2.0-B02.geojson';

	let deals: any = {};
	let providers: any = [];

	let canvas: HTMLElement;
	let start: any;
	let current;
	let box: any;
	let selectedFeatures: any[] = [];
	let cidArray: string[] = [];
	let exportfeatures: any[] = [];

	// Layer management
	let geoJSONOptions: { value: string; label: string }[] = [];
	let showSwapLayer = false;
	let swapGeoJSON = '';
	let selectedSwapGeoJSON = '';

	let autocomplete: any;

	let map: Map;

	async function getIPFSMetadata(cid: string): Promise<number> {
		const requestOptions: RequestInit = {
			method: 'GET',
			redirect: 'follow' as RequestRedirect
		};

		try {
			const response = await fetch(
				// `https://ipfs-check-backend.ipfs.io/check?cid=${cid}&multiaddr=&ipniIndexer=https://cid.contact&timeoutSeconds=60`,
				`https://delegated-ipfs.dev/routing/v1/providers/${cid}`,
				requestOptions
			);
			if (!response.ok) {
				throw new Error(`Error fetching metadata for CID ${cid}: ${response.statusText}`);
			}
			const data = await response.json();

			// return the number of objects where connectionError is ""
			// const ipfsCount = data.filter((item: any) => item.ID && item.ConnectionError === "").length
			// alternatively return the number of objects where ID is not null
			// const ipfsCount = data && Array.isArray(data) ? data.filter((item: any) => item.ID).length : 0;

			// Return count from delegated-ipfs endpoint
			const ipfsCount = data.Providers ? data.Providers.length : 0;
			return ipfsCount;
		} catch (error) {
			console.error(`Failed to fetch metadata for CID ${cid}:`, error);
			return 0;
		}
	}

	async function createPopupContent(feature: Web3EnrichedMapboxFeature): Promise<HTMLDivElement> {
		const properties = feature.properties;
		console.log(properties);
		try {
			const response = await fetch(
				`https://api.tools.d.interplanetary.one/api/search?limit=10&page=1&filter=${properties.piece_cid}&isActive=1`,
				{
					method: 'GET'
				}
			);

			deals = await response.json();
			console.log(deals);
		} catch (err) {
			console.log(err);
		}

		console.log(properties);
		// const metadata = await retrieveMetadata(properties.PATH, properties.ROW, stac_endpoint);
		// console.log(`Metadata: ${JSON.stringify(metadata)}`);

		const pinCount = await getIPFSMetadata(properties.cid);
		let deals_count = deals.data ? deals.data.length : 0;
		const content = document.createElement('div');
		content.innerHTML = `
		<div class="popup-item">
			<strong style="font-size: 1.1em;">Item ID:</strong>
			<a 
				href="https://radiantearth.github.io/stac-browser/#/external/stac.easierdata.info/api/v1/pgstac/collections/${
					properties.collectionName
				}/items/${properties.item_id}" 
				target="_blank" 
				rel="noopener noreferrer"
				style="display: block; background-color: #282c34; color: #7eb6ff; padding: 5px; border-radius: 3px; margin-top: 2px; margin-bottom: 8px; font-family: monospace; word-wrap: break-word; overflow-wrap: break-word; text-decoration: none;"
				>${properties.item_id}</a>
		</div>
		<div class="popup-item">
			<strong style="font-size: 1.1em;">Name:</strong>
			<div style="background-color: #282c34; color: #e6e6e6; padding: 5px; border-radius: 3px; margin-top: 2px; margin-bottom: 8px; font-family: monospace; word-wrap: break-word; overflow-wrap: break-word;">${
				properties.filename
			}</div>
		</div>
		<div class="popup-item">
			<strong style="font-size: 1.1em;">Filecoin Piece CID:</strong>
			<a 
				href="https://filecoin.tools/search?q=${properties.piece_cid}" 
				target="_blank" 
				rel="noopener noreferrer"
				style="display: block; background-color: #282c34; color: #7eb6ff; padding: 5px; border-radius: 3px; margin-top: 2px; margin-bottom: 8px; font-family: monospace; word-wrap: break-word; overflow-wrap: break-word; text-decoration: none;"
				>${properties.piece_cid}</a>
		</div>
		<div class="popup-item">
			<strong style="font-size: 1.1em;">IPFS CID:</strong>
			<div style="background-color: #282c34; color: #e6e6e6; padding: 5px; border-radius: 3px; margin-top: 2px; margin-bottom: 8px; font-family: monospace; word-wrap: break-word; overflow-wrap: break-word;">${
				properties.cid
			}</div>
		<strong style="font-size: 1.1em;">Date acquired:</strong> ${new Date(
			properties.datetime
		).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})}<br>
		<span class="pins"><strong style="font-size: 1.1em;">Pinned on:</strong> ${
			pinCount ?? 'N/A'
		} IPFS nodes</span><br>
		<strong style="font-size: 1.1em;">Stored in:</strong> ${deals_count ?? 'N/A'} Filecoin Deals<br> 
		<div class="MetamaskContainer">
			<div class="connectedState" style="display: none;">Connected</div>
		</div>
		<div class="downloadContainer">
			<strong style="font-size: 1.1em;">Download From:</strong>
		</div>
		<div class="otherContainer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;"></div>
		`;

		const pinButton = document.createElement('button');
		pinButton.setAttribute('id', 'pinButton');
		pinButton.textContent = 'Pin to local';
		pinButton.className = 'downloadButton';

		const fetchButton = document.createElement('button');
		fetchButton.textContent = 'Fetch from cold storage';
		fetchButton.id = 'fetchButton';
		fetchButton.className = 'downloadButton';
		fetchButton.addEventListener('click', connectWallet);

		const codeButton = document.createElement('button');
		codeButton.textContent = 'More';
		codeButton.id = 'codeButton';
		codeButton.className = 'downloadButton';
		codeButton.addEventListener('click', () => {
			showModal = true;
			cid = properties.cid;
		});

		const downloadIpfsButton = document.createElement('button');
		downloadIpfsButton.id = 'downloadIpfs';
		downloadIpfsButton.className = 'downloadButton';
		downloadIpfsButton.textContent = 'IPFS';
		downloadIpfsButton.addEventListener('click', () => {
			window.open(
				`https://gateway.easierdata.info/ipfs/${properties.cid}?filename=${encodeURIComponent(
					properties.filename
				)}`,
				'_blank'
			);
		});

		const downloadFilecoinButton = document.createElement('button');
		downloadFilecoinButton.id = 'downloadFilecoin';
		downloadFilecoinButton.className = 'downloadButton';
		downloadFilecoinButton.textContent = 'Filecoin Storage Provider';
		downloadFilecoinButton.addEventListener('click', () => {
			window.open(`http://f02639429.infrafolio.com/ipfs/${properties.cid}`, '_blank');
		});

		const downloadContainer = content.querySelector('.downloadContainer');
		if (downloadContainer) {
			downloadContainer.appendChild(downloadIpfsButton);
			downloadContainer.appendChild(downloadFilecoinButton);
		}

		const otherContainer = content.querySelector('.otherContainer');
		if (otherContainer) {
			otherContainer.appendChild(pinButton);
			otherContainer.appendChild(fetchButton);
			otherContainer.appendChild(codeButton);
		}

		// content.appendChild(pinButton);
		// content.appendChild(fetchButton);
		// content.appendChild(codeButton);
		// content.appendChild(downloadIpfs);
		// content.appendChild(downloadFilecoin);

		return content;
	}

	async function connectWallet(): Promise<void> {
		if (window.ethereum) {
			await window.ethereum.request({ method: 'eth_requestAccounts' });
			const provider = new ethers.BrowserProvider(window.ethereum);
			const signer = await provider.getSigner();
			console.log(signer);

			const tx = await signer.sendTransaction({
				to: '0x92d3267215Ec56542b985473E73C8417403B15ac',
				value: ethers.parseUnits('0.001', 'ether')
			});

			alert(`Sent transaction: ${tx.hash}`);

			const connectButton = document.querySelector(
				'.MetamaskContainer .connectButton'
			) as HTMLButtonElement;
			const connectedState = document.querySelector(
				'.MetamaskContainer .connectedState'
			) as HTMLDivElement;

			if (connectButton) {
				connectButton.style.display = 'none';
			}

			if (connectedState) {
				connectedState.style.display = 'block';
			}
		} else {
			alert('Metamask not detected!');
		}
	}

	const get_collections = async (url: string) => {
		const response = await fetch(`${url}/collections`);
		const data = await response.json();
		return data;
	};

	async function addNewLayer(): Promise<void> {
		let metadata: any = {
			url: addStac,
			collections: [],
			selected_asset: '',
			selectedFeatures: []
		};

		const collections = await get_collections(addStac);
		console.log(collections.collections);

		for (let x = 0; x < collections.collections.length; x++) {
			const collection = collections.collections[x];
			let collection_data = {
				id: collection.id,
				title: collection.title,
				features: []
			};

			const features = await fetch(`${addStac}/collections/${collection.id}/items`);
			const feature_data = await features.json();

			collection_data.features = feature_data.features;
			console.log(collection_data);
			metadata.collections.push(collection_data);
		}

		metadata.selected_asset = Object.keys(metadata.collections[0].features[0].assets)[0];

		console.log(metadata);
		stac_api_layers = [...stac_api_layers, metadata];
		console.log(stac_api_layers);

		addStac = '';
		showAddLayer = false;
	}

	async function toggleAsset(e: any, collection: any, asset: string) {
		console.log(e.target.checked);
		if (e.target.checked) {
			console.log(collection, asset);
			collection.selected_asset = asset;

			let selectedFeatures: any = [];

			collection.features.forEach((feature: any) => {
				let feat = {
					type: 'Feature',
					properties: {
						PATH: parseInt(feature.properties['landsat:wrs_path']),
						ROW: parseInt(feature.properties['landsat:wrs_row']),
						cid: feature.assets[asset]['alternate']['Filecoin']['href'].split('/')[2],
						datetime: feature.properties['datetime'],
						s3: feature.assets[asset]['alternate']['s3']['href'],
						filename: feature.id,
						ipfs_cid: feature.assets[asset]['alternate']['IPFS']['href'].split('/')[2]
					},
					geometry: feature.geometry
				};
				selectedFeatures.push(feat);
			});

			collection.selectedFeatures = selectedFeatures;

			const geojson: any = {
				type: 'FeatureCollection',
				features: collection.selectedFeatures
			};

			map.addSource(collection.id, {
				type: 'geojson',
				data: geojson
			});

			map.addLayer({
				id: collection.id,
				type: 'fill',
				source: collection.id,
				paint: {
					'fill-color': 'grey',
					'fill-opacity': 0.2,
					'fill-outline-color': 'black'
				}
			});

			map.addLayer({
				id: `${collection.id}-highlighted`,
				type: 'fill',
				source: collection.id,
				paint: {
					'fill-outline-color': 'black',
					'fill-color': '#484896',
					'fill-opacity': 0.75
				},
				filter: ['all', ['==', 'PATH', ''], ['==', 'ROW', '']]
			});

			map.on('click', collection.id, (e) => handleClick(e, map) as any);
			map.on('mouseenter', collection.id, handleMouseEnter);
			map.on('mouseleave', collection.id, handleMouseLeave);
		} else {
			map.removeLayer(collection.id);
			map.removeLayer(`${collection.id}-highlighted`);
			map.removeSource(collection.id);
			collection.selected_asset = asset;
			collection.selectedFeatures = [];
		}
	}

	function setupLayer() {
		map.addSource('LANDSAT_SCENE_OUTLINES', {
			type: 'geojson',
			data: geojson_endpoint
		});

		map.on('sourcedata', function (e) {
			if (e.sourceId === 'LANDSAT_SCENE_OUTLINES' && map.isSourceLoaded('LANDSAT_SCENE_OUTLINES')) {
				map.addLayer({
					id: 'LANDSAT_SCENE_OUTLINES-layer',
					type: 'fill',
					source: 'LANDSAT_SCENE_OUTLINES',
					paint: {
						'fill-color': 'grey',
						'fill-opacity': 0.2,
						'fill-outline-color': 'black'
					}
				});

				map.addLayer({
					id: 'LANDSAT_SCENE_OUTLINES-highlighted',
					type: 'fill',
					source: 'LANDSAT_SCENE_OUTLINES',
					paint: {
						'fill-outline-color': 'black',
						'fill-color': '#484896',
						'fill-opacity': 0.75
					},
					filter: ['all', ['==', 'PATH', ''], ['==', 'ROW', '']]
				});
			}
		});
	}

	function mouseDown(e: any) {
		// Break if shift is released
		if (!(e.shiftKey && e.button === 0)) return;
		map.dragPan.disable();

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
		document.addEventListener('keydown', onKeyDown);

		start = mousePos(e);
	}

	function onKeyDown(e: any) {
		if (e.keyCode === 27) finish(e);
	}

	function mousePos(e: any) {
		const rect = canvas.getBoundingClientRect();
		return new mapboxgl.Point(
			e.clientX - rect.left - canvas.clientLeft,
			e.clientY - rect.top - canvas.clientTop
		);
	}

	function onMouseMove(e: any) {
		current = mousePos(e);

		if (!box) {
			box = document.createElement('div');
			box.classList.add('boxdraw');
			canvas.appendChild(box);
		}

		const minX = Math.min(start.x, current.x),
			maxX = Math.max(start.x, current.x),
			minY = Math.min(start.y, current.y),
			maxY = Math.max(start.y, current.y);

		const pos = `translate(${minX}px, ${minY}px)`;
		box.style.transform = pos;
		box.style.width = maxX - minX + 'px';
		box.style.height = maxY - minY + 'px';
	}

	function onMouseUp(e: any) {
		finish([start, mousePos(e)]);
	}

	function finish(bbox: any) {
		console.log(bbox);
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('keydown', onKeyDown);
		document.removeEventListener('mouseup', onMouseUp);

		if (box) {
			box.parentNode.removeChild(box);
			box = null;
		}

		if (bbox) {
			// Get all layers
			const layers = map.getStyle().layers;

			// Get all layers that have rendered geometry
			const addedLayers = layers.filter((layer) => {
				return (
					layer.type === 'fill' &&
					map.queryRenderedFeatures(bbox, { layers: [layer.id] }).length > 0 &&
					layer.id !== 'hillshade' &&
					layer.id !== 'water' &&
					layer.id !== 'LANDSAT_SCENE_OUTLINES-layer'
				);
			});

			const renderedLayers = [
				'LANDSAT_SCENE_OUTLINES-layer',
				...addedLayers.map((layer) => layer.id)
			];

			const features = map.queryRenderedFeatures(bbox, {
				layers: renderedLayers
			});

			// Construct export features
			exportfeatures = [];
			features.forEach((feature) => {
				exportfeatures.push({
					type: 'Feature',
					geometry: feature.geometry,
					properties: feature.properties
				});
			});

			features.forEach((feature) => {
				if (feature.properties) {
					const path = feature.properties.PATH;
					const row = feature.properties.ROW;
					feature.properties.PATHROW = `${path}${row}`;
				}
			});

			selectedFeatures = features;
			features.forEach((feature) => {
				if (feature.properties) cidArray.push(feature.properties.cid);
			});

			const mergedPathRows = features.map(
				(feature) => `${feature.properties?.PATH}${feature.properties?.ROW}`
			);

			for (let i = 0; i < renderedLayers.length; i++) {
				map.setFilter(`${renderedLayers[i]}-highlighted`, [
					'in',
					['concat', ['get', 'PATH'], ['get', 'ROW']],
					['literal', mergedPathRows]
				]);
			}

			map.setFilter('LANDSAT_SCENE_OUTLINES-highlighted', [
				'in',
				['concat', ['get', 'PATH'], ['get', 'ROW']],
				['literal', mergedPathRows]
			]);
		}

		map.dragPan.enable();
	}

	async function handleClick(
		e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] },
		map: Map
	) {
		const coordinates = e.lngLat;
		if (!e.features || !e.features.length) {
			console.warn('No features found. Click event ignored.');
			return;
		}
		const feature = e.features[0] as Web3EnrichedMapboxFeature;
		if (!feature || !feature.properties) {
			console.warn('Feature or feature properties are not defined. Click event ignored.');
			return;
		}

		console.log(feature);
		let id =
			feature.layer.id == 'LANDSAT_SCENE_OUTLINES-layer'
				? 'LANDSAT_SCENE_OUTLINES-highlighted'
				: `${feature.layer.id}-highlighted`;

		map.setFilter(id, [
			'all',
			['==', 'PATH', feature.properties.PATH],
			['==', 'ROW', feature.properties.ROW]
		]);

		// const popup_content = await createPopupContent(feature);
		const popup = new mapboxgl.Popup({ className: 'custom-popup' })
			.setLngLat(coordinates)
			.setDOMContent(document.createTextNode('Loading metadata...'))
			.addTo(map);

		createPopupContent(feature).then((popupContent) => {
			popup.setDOMContent(popupContent);
		});

		popup.on('close', function () {
			map.setFilter(id, ['all', ['==', 'PATH', ''], ['==', 'ROW', '']]);
		});
	}

	function handleMouseEnter() {
		map.getCanvas().style.cursor = 'pointer';
	}

	function handleMouseLeave() {
		map.getCanvas().style.cursor = '';
	}
	let searchTerm = '';

	function clearSearch(): void {
		searchTerm = '';
		const inputElement = document.getElementById('searchInput');
		if (inputElement) {
			inputElement.focus();
		}
	}
	async function handleKeyDown(event: KeyboardEvent): Promise<void> {
		if (event.key === 'Enter' || event.key === ' ') {
			await filterByQuery();
		}
	}

	async function filterByQuery() {
		console.log(searchTerm);
		if (searchTerm.toUpperCase().includes('PATH') && searchTerm.toUpperCase().includes('ROW')) {
			let query = searchTerm.split(',');
			let path = null,
				row = null;

			query.forEach((e: string) => {
				if (e.toUpperCase().includes('PATH')) path = searchTerm.toUpperCase().split('PATH=')[1];
				if (e.toUpperCase().includes('ROW')) row = searchTerm.toUpperCase().split('ROW=')[1];
			});

			if (path && row) {
				map.setFilter('LANDSAT_SCENE_OUTLINES-highlighted', [
					'all',
					['==', 'PATH', parseInt(path)],
					['==', 'ROW', parseInt(row)]
				]);

				var feat = map.querySourceFeatures('LANDSAT_SCENE_OUTLINES', {
					sourceLayer: 'cid_enriched4-49jvb4',
					filter: ['all', ['==', 'PATH', parseInt(path)], ['==', 'ROW', parseInt(row)]]
				});

				updateInspect(feat);
			}
		} else if (searchTerm.toUpperCase().includes('PATH')) {
			// Render path
			let path = searchTerm.toUpperCase().split('PATH=')[1];
			map.setFilter('LANDSAT_SCENE_OUTLINES-highlighted', ['all', ['==', 'PATH', parseInt(path)]]);

			let feat = map.querySourceFeatures('LANDSAT_SCENE_OUTLINES', {
				sourceLayer: 'cid_enriched4-49jvb4',
				filter: ['all', ['==', 'PATH', parseInt(path)]]
			});

			updateInspect(feat);
		} else if (searchTerm.toUpperCase().includes('ROW')) {
			// Render row
			let row = searchTerm.toUpperCase().split('ROW=')[1];
			map.setFilter('LANDSAT_SCENE_OUTLINES-highlighted', ['all', ['==', 'ROW', parseInt(row)]]);

			let features = map.querySourceFeatures('LANDSAT_SCENE_OUTLINES', {
				sourceLayer: 'cid_enriched4-49jvb4',
				filter: ['all', ['==', 'ROW', parseInt(row)]]
			});

			updateInspect(features);
		} else if (searchTerm.includes(' ') && searchTerm.length > 3) {
			console.log(searchTerm);

			const pathrow = await geocodeQuery(searchTerm);

			map.setFilter('LANDSAT_SCENE_OUTLINES-highlighted', [
				'all',
				['==', 'PATH', pathrow.path],
				['==', 'ROW', pathrow.row]
			]);
		} else {
			// Clear filter
			map.setFilter('LANDSAT_SCENE_OUTLINES-highlighted', [
				'all',
				['==', 'PATH', ''],
				['==', 'ROW', '']
			]);
		}
	}

	function updateInspect(features: mapboxgl.MapboxGeoJSONFeature[]) {
		let newFeatures: any[] = [];
		features.forEach((feature) => {
			if (feature.properties && !cidArray.includes(feature.properties.ipfs_cid)) {
				cidArray.push(feature.properties.ipfs_cid);
				newFeatures.push(feature);
			}
		});

		selectedFeatures = newFeatures;
	}

	// Custom layer button control
	class LayerButton {
		onAdd() {
			const div = document.createElement('div');
			div.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
			div.innerHTML = `
			<button>
				<svg focusable="false" viewBox="0 0 24 24" aria-hidden="true" style="font-size: 20px;">
					<path d="M4 18h16v-2H4v2zM4 13h16v-2H4v2zM4 6v2h16V6H4z"></path>
				</svg>
			</button>`;
			div.addEventListener('contextmenu', (e) => e.preventDefault());
			div.addEventListener('click', () => {
				showAddLayer = true;
				//addGeojson = '';
				addStac = '';
			});

			return div;
		}
	}

	class SwapLayerButton {
		onAdd() {
			const div = document.createElement('div');
			div.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
			div.innerHTML = `
            <button title="Swap Base Layer">
                <svg focusable="false" viewBox="0 0 24 24" aria-hidden="true" style="font-size: 20px;">
                    <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"></path>
                </svg>
            </button>`;
			div.addEventListener('contextmenu', (e) => e.preventDefault());
			div.addEventListener('click', () => {
				showSwapLayer = true;
				swapGeoJSON = '';
				selectedSwapGeoJSON = '';
			});

			return div;
		}
	}

	function handle_delete(url: string) {
		console.log(url);
		const index = stac_api_layers.findIndex((layer: any) => layer.url === url);
		console.log(index);
		stac_api_layers = stac_api_layers.slice(0, index).concat(stac_api_layers.slice(index + 1));

		console.log(stac_api_layers);
	}

	onMount(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const stac = sessionStorage.getItem('stac') || urlParams.get('stac');
		const geojson = sessionStorage.getItem('geojson') || urlParams.get('geojson');

		if (stac && stac != '') {
			stac_endpoint = stac;
		}

		if (geojson && geojson != '') {
			geojson_endpoint = geojson;
		}

		const loader = new Loader({
			apiKey: import.meta.env.VITE_GOOGLEAPIKEY,
			version: 'weekly',
			libraries: ['places']
		});

		loader.loadCallback((e) => {
			if (e) {
				console.log(e);
			} else {
				let input: any = document.getElementById('searchInput');

				const google = window.google;
				autocomplete = new google.maps.places.Autocomplete(input, {
					strictBounds: false
				});
			}

			autocomplete.addListener('place_changed', onPlaceChanged);
		});

		if (!import.meta.env.VITE_MAPBOX_TOKEN) {
			throw new Error('MAPBOX_TOKEN is required');
		}
		mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

		map = new mapboxgl.Map({
			container: 'map',
			style: 'mapbox://styles/mnanas2004/cllzdp0ir01of01phd51o2x3k',
			center: [-98.5795, 39.8283],
			zoom: 3
		});

		const addLayerButton: any = new LayerButton();
		const swapLayerButton: any = new SwapLayerButton();
		const defaultControls = new mapboxgl.NavigationControl();
		map.addControl(defaultControls, 'top-right');
		map.addControl(addLayerButton, 'bottom-right');
		map.addControl(swapLayerButton, 'bottom-right');

		map.on('load', () => {
			canvas = map.getCanvasContainer();

			setupLayer();
			map.on('click', 'LANDSAT_SCENE_OUTLINES-layer', (e) => handleClick(e, map) as any);
			map.on('mouseenter', 'LANDSAT_SCENE_OUTLINES-layer', handleMouseEnter);
			map.on('mouseleave', 'LANDSAT_SCENE_OUTLINES-layer', handleMouseLeave);

			// Multi select controls
			canvas.addEventListener('mousedown', mouseDown, true);
			map.getCanvas().addEventListener('keydown', (e) => {
				e.preventDefault();
				if (e.key == 'Escape') {
					const layers = map.getStyle().layers;

					// Get all layers that have rendered geometry
					const addedLayers = layers.filter((layer) => {
						return layer.type === 'fill' && layer.id.includes('-highlighted');
					});

					const renderedLayers = [
						'LANDSAT_SCENE_OUTLINES-layer',
						...addedLayers.map((layer) => layer.id)
					];

					for (let i = 0; i < renderedLayers.length; i++) {
						map.setFilter(`${renderedLayers[i]}`, ['in', ['==', 'PATH', ''], ['==', 'ROW', '']]);
					}

					map.setFilter('LANDSAT_SCENE_OUTLINES-highlighted', [
						'all',
						['==', 'PATH', ''],
						['==', 'ROW', '']
					]);

					selectedFeatures = [];
					cidArray = [];
				}
			});
		});

		try {
			const response = await fetch('/api/geojson-files');
			geoJSONOptions = await response.json();
		} catch (error) {
			console.error('Failed to fetch GeoJSON files for AddLayer:', error);
		}
	});

	function handleSwapGeoJSONSelect(event: any) {
		const selected = event.target.value;
		selectedSwapGeoJSON = selected;
		if (selected) {
			swapGeoJSON = selected;
		}
	}

	async function swapBaseLayer() {
		if (!swapGeoJSON) {
			alert('Please select a GeoJSON file to swap to');
			return;
		}

		try {
			const response = await fetch(swapGeoJSON);
			const geoJsonData = await response.json();

			if (map.getLayer('LANDSAT_SCENE_OUTLINES-highlighted')) {
				map.removeLayer('LANDSAT_SCENE_OUTLINES-highlighted');
			}
			if (map.getLayer('LANDSAT_SCENE_OUTLINES-layer')) {
				map.removeLayer('LANDSAT_SCENE_OUTLINES-layer');
			}
			if (map.getSource('LANDSAT_SCENE_OUTLINES')) {
				map.removeSource('LANDSAT_SCENE_OUTLINES');
			}

			geojson_endpoint = swapGeoJSON;

			map.addSource('LANDSAT_SCENE_OUTLINES', {
				type: 'geojson',
				data: geoJsonData
			});

			map.addLayer({
				id: 'LANDSAT_SCENE_OUTLINES-layer',
				type: 'fill',
				source: 'LANDSAT_SCENE_OUTLINES',
				paint: {
					'fill-color': 'grey',
					'fill-opacity': 0.2,
					'fill-outline-color': 'black'
				}
			});

			map.addLayer({
				id: 'LANDSAT_SCENE_OUTLINES-highlighted',
				type: 'fill',
				source: 'LANDSAT_SCENE_OUTLINES',
				paint: {
					'fill-outline-color': 'black',
					'fill-color': '#484896',
					'fill-opacity': 0.75
				},
				filter: ['all', ['==', 'PATH', ''], ['==', 'ROW', '']]
			});

			map.on('click', 'LANDSAT_SCENE_OUTLINES-layer', (e) => handleClick(e, map) as any);
			map.on('mouseenter', 'LANDSAT_SCENE_OUTLINES-layer', handleMouseEnter);
			map.on('mouseleave', 'LANDSAT_SCENE_OUTLINES-layer', handleMouseLeave);

			selectedFeatures = [];
			cidArray = [];

			showSwapLayer = false;
		} catch (error) {
			console.error('Failed to swap GeoJSON layer:', error);
			alert('Failed to swap GeoJSON layer.');
		}
	}

	function onPlaceChanged() {
		let address = autocomplete.getPlace();
		searchTerm = address.formatted_address;
	}

	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});
</script>

<div class="search-container">
	<Searchbar bind:searchTerm {handleKeyDown} {clearSearch} />
</div>

<div id="map" />

<Modal bind:showModal>
	<h2 slot="header">Python Integration</h2>

	<div>
		<h3>Import ipfs-stac client</h3>
		<div class="snippet">
			<p>from ipfs_stac import client</p>
		</div>
		<br />
		<h3>Connect to STAC server and fetch CID</h3>
		<div class="snippet">
			<p>
				my_client = client.Web3(stac_endpoint="{stac_endpoint}", local_gateway="127.0.0.1")
				<br />
				data = my_client.getFromCID("{cid}")
			</p>
		</div>
	</div>

	<br />

	<a href="https://pypi.org/project/ipfs-stac/" target="_blank">Get ipfs-stac</a>

	<br />
	<h2>Download Scene with Kubo CLI</h2>
	<hr />
	<div class="snippet">
		<p>ipfs get {cid}</p>
	</div>

	{#if providers.length > 0}
		<h2>Providers {providers.length}</h2>
		<hr />
		{#each providers as prov}
			<Accordion open={false}>
				<span slot="head">Provider [{prov.Provider.ID}]</span>
				<div slot="details">
					<table>
						<tr class="dealRow">
							<th>Context ID</th>
							<th>{prov.ContextID}</th>
						</tr>
						<tr class="dealRow">
							<th>Address</th>
							<th>{prov.Provider.Addrs[0]}</th>
						</tr>
					</table>
				</div>
			</Accordion>
		{/each}
	{/if}

	{#if deals.Deals && deals.Deals?.length > 0}
		<h2>Deals {deals.Deals?.length}</h2>
		<hr />
		{#each deals.Deals as deal}
			<Accordion open={false}>
				<span slot="head">Deal [{deal.DealID}]</span>
				<div slot="details">
					<table>
						<tr class="dealRow">
							<th>Deal Duration</th>
							<th
								>{new Date(deal.DealInfo.Proposal.StartEpochAsDate).toISOString().substring(0, 10)} -
								{new Date(deal.DealInfo.Proposal.EndEpochAsDate).toISOString().substring(0, 10)}</th
							>
						</tr>
						<tr class="dealRow">
							<th>Storage Price Per Epoch</th>
							<th>{deal.DealInfo.Proposal.StoragePricePerEpoch}</th>
						</tr>
						<tr class="dealRow">
							<th>Provider Collateral</th>
							<th>{deal.DealInfo.Proposal.ProviderCollateral}</th>
						</tr>
						<tr class="dealRow">
							<th>Last Updated Epoch</th>
							<th>{deal.DealInfo.State.LastUpdatedEpoch}</th>
						</tr>
						<tr class="dealRow">
							<th>Piece CID</th>
							<th>{deal.DealInfo.Proposal.PieceCID['/']}</th>
						</tr>
						<tr class="dealRow">
							<th>Verified Deal?</th>
							<th>{deal.DealInfo.Proposal.VerifiedDeal}</th>
						</tr>
						<tr class="dealRow">
							<th>Client</th>
							<th>{deal.DealInfo.Proposal.Client}</th>
						</tr>
					</table>
				</div>
			</Accordion>
		{/each}
	{/if}
</Modal>

<Veda bind:showVeda>
	<h2 slot="header">Export to Veda Frontmatter</h2>
</Veda>

<AddLayer bind:showAddLayer>
	<center>
		<h3>Add New Layer</h3>
	</center>
	<form>
		<input
			type="text"
			placeholder="STAC API URL"
			class="url-input"
			bind:value={addStac}
			style="width: 100%;"
		/>
		<br />
		<button style="margin-top: 5px;" on:click={async () => await addNewLayer()}>Add Layer</button>
	</form>
</AddLayer>

<SwapLayer bind:showSwapLayer>
	<h3 slot="header">Swap Base Layer</h3>
	<form>
		<select
			class="url-input"
			on:change={handleSwapGeoJSONSelect}
			bind:value={selectedSwapGeoJSON}
			style="width: 100%;"
		>
			<option value="">Select a GeoJSON to swap to...</option>
			{#each geoJSONOptions as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>

		<br />
		<button style="margin-top: 15px;" on:click={swapBaseLayer}>Swap Layer</button>
	</form>
</SwapLayer>

{#if selectedFeatures.length > 0 || stac_api_layers.length > 0}
	<Sidebar
		bind:stac_api_layers
		bind:selectedFeatures
		bind:stac_endpoint
		bind:cidArray
		bind:exportfeatures
		{connectWallet}
		{toggleAsset}
		{handle_delete}
		bind:showVeda
	/>
{/if}

<style>
	#map {
		margin: 0.15rem;
		width: 100%;
		height: 83%;
	}

	.search-container {
		display: flex;
		align-items: center;
		position: absolute;
		width: 100%;
		top: 8rem;
		left: 3rem;
		z-index: 1;
	}

	.snippet {
		background-color: #f5f5f5;
		color: #1d1d1d;
		border: solid;
		border-color: #e0e0e0;
		border-radius: 5px;
		padding-left: 2px;
	}

	.dealRow {
		border-bottom: 1px solid #ddd;
		text-align: left;
	}

	.dealRow th {
		padding-left: 15px;
	}

	:global(.custom-popup .mapboxgl-popup-content) {
		width: 435; /* Adjust this value to your desired width */
		/* You can also add other styles like padding, max-width, etc. */
		padding: 10px;
	}
</style>
