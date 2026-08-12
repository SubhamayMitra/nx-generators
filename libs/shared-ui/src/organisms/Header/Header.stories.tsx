import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './Header.js';

const meta: Meta<typeof Header> = {
  component: Header,
  title: 'Organisms/Header',
};
export default meta;

type Story = StoryObj<typeof Header>;

export const Storefront: Story = {
  args: {
    productName: 'Storefront',
    navLinks: [
      { label: 'Search', href: '/search' },
      { label: 'Checkout', href: '/checkout' },
    ],
    onSearch: (query: string) => console.log(query),
  },
};
