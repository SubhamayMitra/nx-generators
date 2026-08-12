export type RemoteKeys = 'profile/App';
type PackageType<T> = T extends 'profile/App'
  ? typeof import('profile/App')
  : any;
