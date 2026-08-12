export interface MfeGeneratorSchema {
  shellName: string;
  name: string;
  bundler?: 'rspack' | 'webpack';
  state?: 'rtk' | 'zustand' | 'react-query' | 'none';
}
