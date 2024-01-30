import * as _ from 'lodash';
export declare function isNode(type: any): boolean;
export declare function getDefaultRoot(schema: any): any;
export declare function getTypeGraph(schema: any, rootType: string, hideRoot: boolean): {
    rootId: any;
    nodes: _.Dictionary<any>;
};
