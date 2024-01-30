import * as React from 'react';
import './DocExplorer.css';
interface DocExplorerProps {
    typeGraph: any;
    selectedTypeID: string;
    selectedEdgeID: string;
    onFocusNode: (id: string) => void;
    onSelectNode: (id: string) => void;
    onSelectEdge: (id: string) => void;
}
export default class DocExplorer extends React.Component<DocExplorerProps> {
    state: {
        navStack: {
            title: string;
            type: any;
            searchValue: any;
        }[];
        typeForInfoPopover: any;
    };
    static getDerivedStateFromProps(props: any, state: any): {
        navStack: any[];
        typeForInfoPopover: any;
    };
    render(): JSX.Element;
    renderCurrentNav(currentNav: any): JSX.Element;
    renderNavigation(previousNav: any, currentNav: any): JSX.Element;
    handleSearch: (value: any) => void;
    handleTypeLink: (type: any) => void;
    handleFieldLink: (field: any, type: any) => void;
    handleNavBackClick: () => void;
}
export {};
