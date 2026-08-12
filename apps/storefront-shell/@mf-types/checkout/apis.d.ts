export type RemoteKeys = 'checkout/App';
type PackageType<T> = T extends 'checkout/App'
  ? typeof import('checkout/App')
  : any;
