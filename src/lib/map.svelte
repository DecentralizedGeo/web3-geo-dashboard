<script lang="ts">
	import { Loader } from '@googlemaps/js-api-loader';
	import mapboxgl, { Map } from 'mapbox-gl';
	import { ethers } from 'ethers';
	import { onMount, onDestroy } from 'svelte';
	import type { Web3EnrichedMapboxFeature, metadata, RequestRedirect, RequestInit } from '../types';
	import Modal from './modal.svelte';
	import AddLayer from './components/addLayer.svelte';
	import Sidebar from './components/sidebar.svelte';
	import Accordion from './accordion.svelte';
	import Searchbar from './components/searchbar.svelte';
	import Veda from './components/veda.svelte';

	let showModal = false;
	let showVeda = false;

	// Add layer modal values
	let showAddLayer = false;
	let addStac = '';

	let stac_api_layers: any[] = [];

	let cid = '';
	let stac_endpoint = 'http://ec2-54-172-212-55.compute-1.amazonaws.com/api/v1/pgstac/';
	let geojson_endpoint =
		'https://raw.githubusercontent.com/easierdata/web3-geo-dashboard/feat-custom-geojson/data_processing/cid_enriched.geojson';

	let deals: any = {};
	let providers: any = [];

	let canvas: HTMLElement;
	let start: any;
	let current;
	let box: any;
	let selectedFeatures: any[] = [];
	let cidArray: string[] = [];
	let exportfeatures: any[] = [];

	let autocomplete: any;

	let map: Map;

	async function getPopupMetadata(cid: string): Promise<metadata | undefined> {
		const requestOptions: RequestInit = {
			method: 'GET',
			redirect: 'follow' as RequestRedirect
		};

		try {
			const response = await fetch(
				`https://easier-dashboard-api.vercel.app/api/metadata/${cid}`,
				requestOptions
			);
			if (!response.ok) {
				throw new Error(`Error fetching metadata for CID ${cid}: ${response.statusText}`);
			}
			const data: metadata = await response.json();
			return data;
		} catch (error) {
			console.error(`Failed to fetch metadata for CID ${cid}:`, error);
			return undefined;
		}
	}

	async function createPopupContent(feature: Web3EnrichedMapboxFeature): Promise<HTMLDivElement> {
		const properties = feature.properties;
		console.log(properties);

		try {
			const response = await fetch(
				`https://api.tools.d.interplanetary.one/api/search?limit=10&page=1&filter=${properties.cid}&isActive=1`,
				{
					method: 'GET'
				}
			);

			deals = await response.json();
			console.log(deals);
		} catch (err) {
			console.log(err);
		}

		providers = [];
		const metadata = await getPopupMetadata(properties.cid);
		if (!metadata) {
			console.warn(`No metadata found for CID ${properties.cid}.`);
		}

		providers = metadata?.Providers;

		const content = document.createElement('div');
		content.innerHTML = `
		<b>Inspect Tile</b><br>
		<span class="name-text">Name: ${properties.filename}</span><br>
		<span class="cid-text">Filecoin CID: ${properties.cid}</span><br>
		<span class="ipfs-cid-text">IPFS CID: ${properties.ipfs_cid}</span><br>
		Row: ${properties.ROW}<br>
		Path: ${properties.PATH}<br>
		Date acquired: ${new Date(properties.datetime).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})}<br>
		<span class="pins">Pinned on ${
			metadata?.ipfs ?? 'N/A'
		} IPFS nodes</span><br> <!-- Example of including metadata -->
		Stored in ${
			metadata?.Providers.length ?? 'N/A'
		} Filecoin Peers<br> <!-- Example of including metadata -->
		${metadata?.unsealed ?? 'N/A'} unsealed copies available<br> <!-- Example of including metadata -->
		<div class="MetamaskContainer">
			<div class="connectedState" style="display: none;">Connected</div>
		</div>
		`;

		const pinButton = document.createElement('button');
		pinButton.setAttribute('id', 'pinButton');
		pinButton.textContent = 'Pin to local';

		const fetchButton = document.createElement('button');
		fetchButton.textContent = 'Fetch from cold storage';
		fetchButton.addEventListener('click', connectWallet);

		const codeButton = document.createElement('button');
		codeButton.textContent = 'More';
		codeButton.addEventListener('click', () => {
			showModal = true;
			cid = properties.ipfs_cid;
		});

		content.appendChild(pinButton);
		content.appendChild(fetchButton);
		content.appendChild(codeButton);

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
				if (feature.properties) cidArray.push(feature.properties.ipfs_cid);
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

		const popup_content = await createPopupContent(feature);
		const popup = new mapboxgl.Popup()
			.setLngLat(coordinates)
			.setDOMContent(popup_content)
			.addTo(map);

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

			const response = await fetch(
				`https://easier-dashboard-m5eh5d9da-matthewnanas.vercel.app/api/geocode/${searchTerm}`
			);
			if (!response.ok) {
				throw new Error(`Error fetching geolocation for ${searchTerm}: ${response.statusText}`);
			}
			const data = await response.json();

			map.setFilter('LANDSAT_SCENE_OUTLINES-highlighted', [
				'all',
				['==', 'PATH', data.path],
				['==', 'ROW', data.row]
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
		const defaultControls = new mapboxgl.NavigationControl();
		map.addControl(defaultControls, 'top-right');
		map.addControl(addLayerButton, 'bottom-right');

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
	});

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
</style>
