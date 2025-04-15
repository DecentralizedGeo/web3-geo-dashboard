<script>
	import { onMount } from 'svelte';

	let stac_endpoint = '';
	let geojson_endpoint = '';

	// Variables for GeoJSON dropdown
	let selectedGeoJSON = '';
	let geoJSONOptions = [];

	onMount(async () => {
		try {
			// Fetch available GeoJSON files from your directory
			const response = await fetch('/api/geojson-files');
			geoJSONOptions = await response.json();
		} catch (error) {
			console.log(error);
			alert('Failed to fetch GeoJSON files. (URLs may be hardcoded)');
		}
	});

	function handleGeoJSONSelect(event) {
		const selected = event.target.value;
		selectedGeoJSON = selected;
		if (selected) {
			geojson_endpoint = selected;
		}
	}

	function handleSubmit() {
		const geoJsonToUse = selectedGeoJSON || geojson_endpoint;

		window.sessionStorage.setItem('stac', stac_endpoint);
		window.sessionStorage.setItem('geojson', geoJsonToUse);
		window.location.href = '/map';
	}
</script>

<div class="window">
	<div class="container">
		<form on:submit|preventDefault={handleSubmit}>
			<input type="text" placeholder="STAC API URL" class="url-input" bind:value={stac_endpoint} />
			<input
				type="text"
				placeholder="GeoJSON URL"
				class="url-input"
				bind:value={geojson_endpoint}
			/>

			<div class="or-divider">- OR -</div>

			<select class="url-input" on:change={handleGeoJSONSelect} bind:value={selectedGeoJSON}>
				<option value="">Select a pre-loaded GeoJSON...</option>
				{#each geoJSONOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>

			<button style="margin-top: 5px;" on:click={handleSubmit}>Load Map</button>
		</form>
		<p>*Leave blank for demo*</p>
	</div>
</div>

<style>
	.window {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		width: 100%;
	}

	.or-divider {
		margin: 10px 0;
		font-size: 12px;
		color: #666;
	}

	select.url-input {
		padding: 5px;
		margin-top: 5px;
	}

	.container {
		background-color: white;
		padding: 20px;
		border-radius: 10px;
		width: 320px;
		text-align: center;
	}
	.container p {
		font-weight: bold;
		font-size: 12px;
	}

	.url-input {
		margin-top: 5px;
		width: 90%;
	}

	form {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
</style>
