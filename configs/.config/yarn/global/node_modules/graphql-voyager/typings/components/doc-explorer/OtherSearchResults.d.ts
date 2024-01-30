import * as React from 'react';
interface OtherSearchResultsProps {
    typeGraph: any;
    withinType: any;
    searchValue: string;
    onTypeLink: (type: any) => void;
    onFieldLink: (field: any, type: any) => void;
}
export default class OtherSearchResults extends React.Component<OtherSearchResultsProps> {
    render(): JSX.Element;
}
export {};
