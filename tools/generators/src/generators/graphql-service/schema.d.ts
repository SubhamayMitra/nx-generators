export interface GraphqlServiceGeneratorSchema {
  name: string;
  datasource: 'rest' | 'sql' | 'nosql';
  product?: string;
  gateway?: 'none' | 'new' | 'existing';
}
