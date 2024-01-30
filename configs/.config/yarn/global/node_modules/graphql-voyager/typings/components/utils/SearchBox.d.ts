import * as React from 'react';
import './SearchBox.css';
interface SearchBoxProps {
    placeholder: string;
    value?: string;
    onSearch?: (string: any) => void;
}
interface SearchBoxState {
    value: string;
}
export default class SearchBox extends React.Component<SearchBoxProps, SearchBoxState> {
    timeout: any;
    constructor(props: any);
    componentWillUnmount(): void;
    render(): JSX.Element;
    handleChange: (event: any) => void;
    handleClear: () => void;
}
export {};
