import * as React from 'react';
import { HtmlRenderer, Parser } from 'commonmark';
interface MarkdownProps {
    text: string;
    className: string;
}
export default class Markdown extends React.Component<MarkdownProps> {
    renderer: HtmlRenderer;
    parser: Parser;
    constructor(props: any);
    shouldComponentUpdate(nextProps: any): boolean;
    render(): JSX.Element;
}
export {};
