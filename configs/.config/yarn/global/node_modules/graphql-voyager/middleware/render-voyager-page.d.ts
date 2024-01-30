export interface MiddlewareOptions {
    endpointUrl: string;
    displayOptions?: object;
    headersJS?: string;
}
export default function renderVoyagerPage(options: MiddlewareOptions): string;
