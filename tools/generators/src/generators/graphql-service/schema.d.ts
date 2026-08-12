export interface GraphqlServiceGeneratorSchema {
  name: string;
  datasource: 'rest' | 'sql' | 'nosql';
  gateway?: 'none' | 'new' | 'existing';
}
