import {ZeroArgumentsConstructor} from '@nova-odm/marshaller';

export interface ClassAnnotation {
    (target: ZeroArgumentsConstructor<any>): void;
}

export interface PropertyAnnotation {
    (target: Object, propertyKey: string|symbol): void;
}
