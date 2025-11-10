import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';

interface TeePublicCredentials {
	baseUrl: string;
	sessionCookie?: string;
	proxy?: string;
}

type Resource = 'orders' | 'designs' | 'payouts';
type Operation = 'list' | 'get' | 'sync';

export class TeePublic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TeePublic',
		name: 'teePublic',
		icon: 'file:teepublic.svg',
		group: ['transform'],
		version: 1,
		description:
			'Manage TeePublic orders, designs, and payouts via authenticated HTTP requests that support cookies and proxy routing.',
		defaults: {
			name: 'TeePublic',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'teePublicApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Orders', value: 'orders' },
					{ name: 'Designs', value: 'designs' },
					{ name: 'Payouts', value: 'payouts' },
				],
				default: 'orders',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List records with pagination and filters',
						action: 'List items',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a single record by ID',
						action: 'Get item',
					},
					{
						name: 'Upsert / Sync',
						value: 'sync',
						description: 'Create or update data by sending JSON payloads to TeePublic',
						action: 'Sync item',
					},
				],
				default: 'list',
			},
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['orders'],
						operation: ['get', 'sync'],
					},
				},
				default: '',
				description: 'TeePublic order identifier',
			},
			{
				displayName: 'Design ID',
				name: 'designId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['designs'],
						operation: ['get', 'sync'],
					},
				},
				default: '',
				description: 'TeePublic design identifier/slug',
			},
			{
				displayName: 'Payout ID',
				name: 'payoutId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['payouts'],
						operation: ['get'],
					},
				},
				default: '',
				description: 'Unique ID from the payout ledger',
			},
			{
				displayName: 'Payload',
				name: 'payload',
				type: 'json',
				required: true,
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						operation: ['sync'],
					},
				},
				default: '{}',
				description:
					'JSON payload sent to TeePublic when syncing order statuses, publishing designs, or initiating payouts',
			},
			{
				displayName: 'Additional Query Parameters',
				name: 'queryParameters',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: ['list'],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Parameter',
						name: 'parameter',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Endpoint',
				name: 'customEndpoint',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['list', 'get', 'sync'],
					},
				},
				default: '',
				description:
					'Optional path (e.g., /api/seller/orders) to override the default endpoint derived from the resource/operation',
			},
			{
				displayName: 'Raw Output',
				name: 'rawOutput',
				type: 'boolean',
				default: false,
				description: 'Return the full HTTP response rather than the parsed data field',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = (await this.getCredentials('teePublicApi')) as TeePublicCredentials;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as Resource;
				const operation = this.getNodeParameter('operation', i) as 'list' | 'get' | 'sync';
				const rawOutput = this.getNodeParameter('rawOutput', i, false) as boolean;
				const requestOptions = await buildRequestOptions.call(
					this,
					credentials,
					resource,
					operation,
					i,
				);

				const response = await this.helpers.httpRequest(requestOptions);

				const data = rawOutput
					? response
					: (response?.data ?? response ?? { success: true, message: 'No response body' });

				returnData.push({
					json: Array.isArray(data) ? { items: data } : (data as IDataObject),
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

}

async function buildRequestOptions(
	this: IExecuteFunctions,
	credentials: TeePublicCredentials,
	resource: Resource,
	operation: Operation,
	itemIndex: number,
): Promise<IHttpRequestOptions> {
	const baseUrl = (credentials.baseUrl || '').replace(/\/$/, '');
	if (!baseUrl) {
		throw new Error('Base URL is required in TeePublic credentials.');
	}

	const endpoint = resolveEndpoint.call(this, resource, operation, itemIndex);
	const requestOptions: IHttpRequestOptions = {
		method: resolveMethod(operation),
		url: `${baseUrl}${endpoint}`,
		json: true,
		headers: {
			Accept: 'application/json',
			'User-Agent': 'n8n-teepublic-node',
		},
	};

	if (credentials.sessionCookie) {
		requestOptions.headers!.Cookie = credentials.sessionCookie;
	}

	if (credentials.proxy) {
		requestOptions.proxy = parseProxy(credentials.proxy);
	}

	const qs = resolveQuery.call(this, operation, itemIndex);
	if (Object.keys(qs).length) {
		requestOptions.qs = qs;
	}

	if (operation === 'sync') {
		const payload = this.getNodeParameter('payload', itemIndex) as string | IDataObject;
		requestOptions.body = typeof payload === 'string' ? JSON.parse(payload || '{}') : payload;
	}

	return requestOptions;
}

function resolveEndpoint(
	this: IExecuteFunctions,
	resource: Resource,
	operation: Operation,
	itemIndex: number,
) {
	const customEndpoint = this.getNodeParameter('customEndpoint', itemIndex, '') as string;
	if (customEndpoint) {
		return customEndpoint.startsWith('/') ? customEndpoint : `/${customEndpoint}`;
	}

	const basePaths: Record<Resource, string> = {
		orders: '/api/seller/orders',
		designs: '/api/seller/designs',
		payouts: '/api/seller/payouts',
	};

	const basePath = basePaths[resource];

	if (operation === 'list') {
		return basePath;
	}

	const idMap: Record<Resource, string> = {
		orders: this.getNodeParameter('orderId', itemIndex, '') as string,
		designs: this.getNodeParameter('designId', itemIndex, '') as string,
		payouts: this.getNodeParameter('payoutId', itemIndex, '') as string,
	};

	const targetId = idMap[resource];

	if (!targetId) {
		throw new Error('The selected operation requires an ID, but none was provided.');
	}

	return `${basePath}/${targetId}`;
}

function resolveMethod(operation: Operation): IHttpRequestOptions['method'] {
	return operation === 'sync' ? 'POST' : 'GET';
}

function resolveQuery(this: IExecuteFunctions, operation: Operation, itemIndex: number): IDataObject {
	if (operation !== 'list') {
		return {};
	}

	const kvCollection = this.getNodeParameter('queryParameters', itemIndex, {}) as {
		parameter?: Array<{ key: string; value: string }>;
	};

	const qs: IDataObject = {};

	kvCollection.parameter?.forEach((entry) => {
		if (entry.key) {
			qs[entry.key] = entry.value;
		}
	});

	return qs;
}

function parseProxy(proxyUrl: string): NonNullable<IHttpRequestOptions['proxy']> {
	let parsed: URL;
	try {
		parsed = new URL(proxyUrl);
	} catch {
		throw new Error('Proxy URL is invalid. Please supply a valid http(s) URL.');
	}

	const proxy: NonNullable<IHttpRequestOptions['proxy']> = {
		host: parsed.hostname,
		port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
	};

	const protocol = parsed.protocol.replace(':', '');
	if (protocol) {
		proxy.protocol = protocol;
	}

	if (parsed.username || parsed.password) {
		proxy.auth = {
			username: decodeURIComponent(parsed.username),
			password: decodeURIComponent(parsed.password),
		};
	}

	return proxy;
}
