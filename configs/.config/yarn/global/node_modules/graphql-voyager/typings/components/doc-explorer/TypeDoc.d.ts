import * as React from 'react';
import './TypeDoc.css';
interface TypeDocProps {
    selectedType: any;
    selectedEdgeID: string;
    typeGraph: any;
    filter: string;
    onSelectEdge: (string: any) => void;
    onTypeLink: (any: any) => void;
}
export default class TypeDoc extends React.Component<TypeDocProps> {
    componentDidUpdate(prevProps: TypeDocProps): void;
    componentDidMount(): void;
    ensureActiveVisible(): void;
    render(): JSX.Element;
}
export {};
