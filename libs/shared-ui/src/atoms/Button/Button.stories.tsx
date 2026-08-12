import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button.js';

const meta: Meta<typeof Button> = {
  component: Button,
  title: 'Atoms/Button',
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Save search' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
};

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Save search', disabled: true },
};
