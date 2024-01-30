import * as React from 'react';
interface GraphViewportProps {
    svgRenderer: any;
    typeGraph: any;
    displayOptions: any;
    selectedTypeID: string;
    selectedEdgeID: string;
    onSelectNode: (id: string) => void;
    onSelectEdge: (id: string) => void;
}
export default class GraphViewport extends React.Component<GraphViewportProps> {
    state: {
        typeGraph: any;
        displayOptions: any;
        svgViewport: any;
    };
    _currentTypeGraph: any;
    _currentDisplayOptions: any;
    static getDerivedStateFromProps(props: any, state: any): {
        typeGraph: any;
        displayOptions: any;
        svgViewport: any;
    };
    componentDidMount(): void;
    componentDidUpdate(prevProps: any, prevState: any): void;
    componentWillUnmount(): void;
    _renderSvgAsync(typeGraph: any, displayOptions: any): void;
    render(): JSX.Element;
    resize(): void;
    focusNode(id: any): void;
    _cleanupSvgViewport(): void;
}
export {};
