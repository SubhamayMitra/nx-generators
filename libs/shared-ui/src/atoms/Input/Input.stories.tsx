import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input.js';

const meta: Meta<typeof Input> = {
  component: Input,
  title: 'Atoms/Input',
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Search products…' },
};
