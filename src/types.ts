type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;

interface CustomFeatureProperties {
	piece_cid: string;
	ipfs_cid: string;
	ROW: string;
	PATH: string;
	cid: string;
	datetime: ISODateString;
	s3: string;
	filename: string;
	item_id: string;
	collectionName: string;
	// IPFS_NODES: number;
	// FIL_DEALS: number;
	// ON_S3: boolean;
}

export interface Web3EnrichedMapboxFeature extends mapboxgl.MapboxGeoJSONFeature {
	properties: CustomFeatureProperties;
}

export interface metadata {
	ipfs: number;
	filecoin: number;
	unsealed: number;
	Providers: any[];
}

export type RequestRedirect = 'error' | 'follow' | 'manual';

export interface RequestInit {
	/** A BodyInit object or null to set request's body. */
	body?: BodyInit | null;
	/** A string indicating how the request will interact with the browser's cache to set request's cache. */
	cache?: RequestCache;
	/** A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials. */
	credentials?: RequestCredentials;
	/** A Headers object, an object literal, or an array of two-item arrays to set request's headers. */
	headers?: HeadersInit;
	/** A cryptographic hash of the resource to be fetched by request. Sets request's integrity. */
	integrity?: string;
	/** A boolean to set request's keepalive. */
	keepalive?: boolean;
	/** A string to set request's method. */
	method?: string;
	/** A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode. */
	mode?: RequestMode;
	/** A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect. */
	redirect?: RequestRedirect;
	/** A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer. */
	referrer?: string;
	/** A referrer policy to set request's referrerPolicy. */
	referrerPolicy?: ReferrerPolicy;
	/** An AbortSignal to set request's signal. */
	signal?: AbortSignal | null;
	/** Can only be null. Used to disassociate request from any Window. */
	window?: null;
}
