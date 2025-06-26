import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TidiApi implements ICredentialType {
	name = 'tidiApi';
	displayName = 'Tidi API';
	documentationUrl = 'https://api.tidi.com.br/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Chave da API fornecida pela plataforma Tidi',
		},
	];
}
