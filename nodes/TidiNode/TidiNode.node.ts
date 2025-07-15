import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
// @ts-ignore
import { URLSearchParams } from 'url';

export class TidiNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tidi Node',
		name: 'tidiNode',
		icon: 'file:/tidi.svg',
		group: ['transform'],
		version: 1,
		description: 'Nós oficiais da plataforma de agendamentos Tidi.',
		defaults: {
			name: 'Tidi Node',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'tidiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Agendar Horário',
						value: 'schedule',
						description: 'Realiza um agendamento de horário',
						action: 'Agendar horario',
					},
					{
						name: 'Listar Profissionais',
						value: 'getProfessionals',
						description: 'Lista todos os profissionais do parceiro',
						action: 'Lista todos os profissionais do parceiro',
					},
					{
						name: 'Listar Serviços',
						value: 'getServices',
						description: 'Lista todos os serviços do parceiro',
						action: 'Lista todos os servi os do parceiro',
					},
					{
						name: 'Obter Informações Do Parceiro',
						value: 'getPartner',
						description: 'Obtém informações do parceiro',
						action: 'Obt m informa es do parceiro',
					},
					{
						name: 'Verificar Disponibilidade',
						value: 'checkAvailability',
						description: 'Verifica disponibilidade na agenda',
						action: 'Verifica disponibilidade na agenda',
					},
				],
				default: 'getPartner',
			},
			{
				displayName: 'Idioma',
				name: 'language',
				type: 'options',
				options: [
					{
						name: 'Português',
						value: 'pt',
					},
					{
						name: 'Inglês',
						value: 'en',
					},
				],
				default: 'pt',
				description: 'Idioma para a requisição',
			},
			// Campos específicos para verificar disponibilidade
			{
				displayName: 'ID Do Profissional',
				name: 'professionalId',
				type: 'string',
				default: '',
				placeholder: 'ID do profissional',
				description: 'ID do profissional para verificar disponibilidade',
				displayOptions: {
					show: {
						operation: ['checkAvailability'],
					},
				},
			},
			{
				displayName: 'Serviços',
				name: 'services',
				type: 'string',
				default: '',
				placeholder: '["serviceId1", "serviceId2"]',
				description: 'Array JSON com IDs dos serviços',
				displayOptions: {
					show: {
						operation: ['checkAvailability'],
					},
				},
			},
			// Campos opcionais para filtros
			{
				displayName: 'Filtros Adicionais',
				name: 'additionalFilters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'filters',
						displayName: 'Filtro',
						values: [
							{
								displayName: 'Nome Do Campo',
								name: 'key',
								type: 'string',
								default: '',
								description: 'Nome do campo para filtrar',
							},
							{
								displayName: 'Valor',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Valor do filtro',
							},
						],
					},
				],
				displayOptions: {
					show: {
						operation: ['getServices', 'getProfessionals'],
					},
				},
			},
			// Adicionar campos específicos para agendamento
			{
				displayName: 'Dia',
				name: 'day',
				type: 'string',
				default: '',
				placeholder: '2025-08-22',
				description: 'Dia do agendamento (YYYY-MM-DD)',
				displayOptions: {
					show: {
						operation: ['schedule'],
					},
				},
			},
			{
				displayName: 'Hora',
				name: 'hour',
				type: 'string',
				default: '',
				placeholder: '10:00',
				description: 'Hora do agendamento (HH:mm)',
				displayOptions: {
					show: {
						operation: ['schedule'],
					},
				},
			},
			{
				displayName: 'ID Do Profissional',
				name: 'professional',
				type: 'string',
				default: '',
				placeholder: 'ID do profissional',
				description: 'ID do profissional para o agendamento',
				displayOptions: {
					show: {
						operation: ['schedule'],
					},
				},
			},
			{
				displayName: 'Serviços',
				name: 'services',
				type: 'string',
				default: '',
				placeholder: '["serviceId1"]',
				description: 'Array JSON com IDs dos serviços',
				displayOptions: {
					show: {
						operation: ['schedule'],
					},
				},
			},
			{
				displayName: 'Nome',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'Nome do cliente',
				description: 'Nome do cliente',
				displayOptions: {
					show: {
						operation: ['schedule'],
					},
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'cliente@email.com',
				description: 'Email do cliente',
				displayOptions: {
					show: {
						operation: ['schedule'],
					},
				},
			},
			{
				displayName: 'Telefone',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: '31999999999',
				description: 'Telefone do cliente',
				displayOptions: {
					show: {
						operation: ['schedule'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const language = this.getNodeParameter('language', itemIndex, 'pt') as string;

				// Obter credenciais
				const credentials = await this.getCredentials('tidiApi', itemIndex);
				const apiKey = credentials.apiKey as string;

				const baseUrl = 'https://api.tidi.com.br';

				let endpoint = '';
				let method: IHttpRequestMethods = 'GET';
				let body: any = undefined;
				let queryParams: Record<string, any> = {};
                let contentType: string | undefined = undefined;
                let isJson: boolean | undefined = undefined;

				// Configurar endpoint baseado na operação
				switch (operation) {
					case 'getPartner':
						endpoint = `/${language}/integration/partner`;
						break;

					case 'getServices':
						endpoint = `/${language}/integration/partner/services`;
						// Adicionar filtros se especificados
						const serviceFilters = this.getNodeParameter('additionalFilters', itemIndex, {}) as any;
						if (serviceFilters.filters) {
							serviceFilters.filters.forEach((filter: any) => {
								if (filter.key && filter.value) {
									queryParams[filter.key] = filter.value;
								}
							});
						}
						break;

					case 'getProfessionals':
						endpoint = `/${language}/integration/partner/professionals`;
						// Adicionar filtros se especificados
						const professionalFilters = this.getNodeParameter('additionalFilters', itemIndex, {}) as any;
						if (professionalFilters.filters) {
							professionalFilters.filters.forEach((filter: any) => {
								if (filter.key && filter.value) {
									queryParams[filter.key] = filter.value;
								}
							});
						}
						break;

					case 'checkAvailability':
						endpoint = `/${language}/integration/partner/schedule/availability`;
						method = 'POST' as IHttpRequestMethods;
						const professionalId = this.getNodeParameter('professionalId', itemIndex, '') as string;
						const servicesParam = this.getNodeParameter('services', itemIndex, '') as string;

						body = {
							professional: professionalId,
							services: servicesParam,
						};
						break;

					case 'schedule':
						endpoint = `/${language}/integration/partner/schedule`;
						method = 'POST' as IHttpRequestMethods;
						body = {
							day: this.getNodeParameter('day', itemIndex, '') as string,
							hour: this.getNodeParameter('hour', itemIndex, '') as string,
							professional: this.getNodeParameter('professional', itemIndex, '') as string,
							services: this.getNodeParameter('services', itemIndex, '') as string,
							name: this.getNodeParameter('name', itemIndex, '') as string,
							email: this.getNodeParameter('email', itemIndex, '') as string,
							phone: this.getNodeParameter('phone', itemIndex, '') as string,
						};
                        contentType = 'application/x-www-form-urlencoded';
                        isJson = false;
						break;

					default:
						throw new NodeOperationError(this.getNode(), `Operação desconhecida: ${operation}`, {
							itemIndex,
						});
				}

				// Configurar opções da requisição HTTP
				const options: IHttpRequestOptions = {
					method,
					url: `${baseUrl}${endpoint}`,
					headers: {
						'x-api-key': apiKey,
						'Content-Type': contentType || 'application/json',
					},
					json: isJson !== undefined ? isJson : true,
				};

				// Adicionar query parameters se existirem
				if (Object.keys(queryParams).length > 0) {
					options.qs = queryParams;
				}

				// Adicionar body se for POST
				if (body) {
                    if (contentType === 'application/x-www-form-urlencoded') {
                        options.body = new URLSearchParams(body).toString();
                    } else {
					    options.body = body;
                    }
				}

				// Fazer a requisição HTTP
				const response = await this.helpers.httpRequest(options);

				// Adicionar dados de resposta ao item
				const newItem: INodeExecutionData = {
					json: {
						operation,
						success: true,
						data: response,
						metadata: {
							endpoint,
							method,
							timestamp: new Date().toISOString(),
						},
					},
					pairedItem: itemIndex,
				};

				returnData.push(newItem);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							operation: this.getNodeParameter('operation', itemIndex, 'unknown'),
							success: false,
							error: error.message,
							errorData: error.response && error.response.body ? error.response.body : undefined,
							timestamp: new Date().toISOString(),
						},
						error,
						pairedItem: itemIndex,
					});
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					if (error.response && error.response.body) {
						throw new NodeOperationError(this.getNode(), `${error.message} | Detalhe: ${JSON.stringify(error.response.body)}`, {
							itemIndex,
						});
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
