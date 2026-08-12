import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text.js';

const meta: Meta<typeof Text> = {
  component: Text,
  title: 'Atoms/Text',
};
export default meta;

type Story = StoryObj<typeof Text>;

export const Heading: Story = {
  args: { as: 'h2', size: 'xl', children: 'Storefront' },
};

export const Body: Story = {
  args: { children: 'Find the search bar in the header above.' },
};

export const Muted: Story = {
  args: { muted: true, children: '3 saved searches' },
};
