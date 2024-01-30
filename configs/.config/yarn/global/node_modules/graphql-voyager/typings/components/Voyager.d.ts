import { SVGRender } from '../graph/';
import { WorkerCallback } from '../utils/types';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import GraphViewport from './GraphViewport';
import './Voyager.css';
import './viewport.css';
declare type IntrospectionProvider = (query: string) => Promise<any>;
export interface VoyagerDisplayOptions {
    rootType?: string;
    skipRelay?: boolean;
    skipDeprecated?: boolean;
    showLeafFields?: boolean;
    sortByAlphabet?: boolean;
    hideRoot?: boolean;
}
export interface VoyagerProps {
    introspection: IntrospectionProvider | Object;
    displayOptions?: VoyagerDisplayOptions;
    hideDocs?: boolean;
    hideSettings?: boolean;
    workerURI?: string;
    loadWorker?: WorkerCallback;
    children?: React.ReactNode;
}
export default class Voyager extends React.Component<VoyagerProps> {
    static propTypes: {
        introspection: PropTypes.Validator<object>;
        displayOptions: PropTypes.Requireable<PropTypes.InferProps<{
            rootType: PropTypes.Requireable<string>;
            skipRelay: PropTypes.Requireable<boolean>;
            skipDeprecated: PropTypes.Requireable<boolean>;
            sortByAlphabet: PropTypes.Requireable<boolean>;
            hideRoot: PropTypes.Requireable<boolean>;
            showLeafFields: PropTypes.Requireable<boolean>;
        }>>;
        hideDocs: PropTypes.Requireable<boolean>;
        hideSettings: PropTypes.Requireable<boolean>;
        workerURI: PropTypes.Requireable<string>;
        loadWorker: PropTypes.Requireable<(...args: any[]) => any>;
    };
    state: {
        introspectionData: any;
        schema: any;
        typeGraph: any;
        displayOptions: {
            rootType: any;
            skipRelay: boolean;
            skipDeprecated: boolean;
            sortByAlphabet: boolean;
            showLeafFields: boolean;
            hideRoot: boolean;
        };
        selectedTypeID: any;
        selectedEdgeID: any;
    };
    svgRenderer: SVGRender;
    viewportRef: React.RefObject<GraphViewport>;
    instospectionPromise: any;
    constructor(props: any);
    componentDidMount(): void;
    fetchIntrospection(): void;
    updateIntrospection(introspectionData: any, displayOptions: any): void;
    componentDidUpdate(prevProps: VoyagerProps): void;
    render(): JSX.Element;
    renderPanel(): JSX.Element;
    renderSettings(): JSX.Element;
    renderGraphViewport(): JSX.Element;
    handleDisplayOptionsChange: (delta: any) => void;
    handleSelectNode: (selectedTypeID: any) => void;
    handleSelectEdge: (selectedEdgeID: any) => void;
    static PanelHeader: (props: any) => any;
}
export {};
