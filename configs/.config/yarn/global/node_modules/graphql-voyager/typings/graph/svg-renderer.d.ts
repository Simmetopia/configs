import { WorkerCallback } from '../utils/types';
export declare class SVGRender {
    vizPromise: any;
    constructor(workerURI: string, loadWorker?: WorkerCallback);
    renderSvg(typeGraph: any, displayOptions: any): any;
}
