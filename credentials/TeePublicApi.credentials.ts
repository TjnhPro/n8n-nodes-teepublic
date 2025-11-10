import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TeePublicApi implements ICredentialType {
	name = 'teePublicApi';

	displayName = 'TeePublic API';

	documentationUrl = 'https://www.teepublic.com/api';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://www.teepublic.com',
			description: 'Base URL for the TeePublic seller portal',
		},
		{
			displayName: 'Session Cookie',
			name: 'sessionCookie',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description:
				'Raw cookie header value (e.g., session token) captured after logging in to the seller portal',
		},
		{
			displayName: 'Proxy',
			name: 'proxy',
			type: 'string',
			default: '',
			description: 'Optional proxy URL (e.g., http://user:password@host:port)',
		},
	];
}
