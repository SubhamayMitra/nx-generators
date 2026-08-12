import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchBar } from './SearchBar.js';

const meta: Meta<typeof SearchBar> = {
  component: SearchBar,
  title: 'Molecules/SearchBar',
};
export default meta;

type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  args: {
    placeholder: 'Search products…',
    onSearch: (query: string) => console.log(query),
  },
};
