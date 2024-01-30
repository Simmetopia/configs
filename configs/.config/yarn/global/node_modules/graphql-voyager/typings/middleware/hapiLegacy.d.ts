export interface Register {
    (server: any, options: any, next: any): void;
    attributes?: any;
}
declare const hapi: Register;
export default hapi;
