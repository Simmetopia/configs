import { SimplifiedTypeWithIDs } from '../../introspection/types';
import * as React from 'react';
interface TypeDetailsProps {
    type: SimplifiedTypeWithIDs;
    onTypeLink: (any: any) => void;
}
export default class TypeDetails extends React.Component<TypeDetailsProps> {
    renderFields(type: SimplifiedTypeWithIDs, onTypeLink: any): JSX.Element;
    renderEnumValues(type: SimplifiedTypeWithIDs): JSX.Element;
    render(): JSX.Element;
}
export {};
