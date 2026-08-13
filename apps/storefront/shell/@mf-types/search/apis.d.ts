export type RemoteKeys = 'search/App';
type PackageType<T> = T extends 'search/App'
  ? typeof import('search/App')
  : any;
