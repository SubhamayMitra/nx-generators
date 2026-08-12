import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShellTemplate } from './AppShellTemplate.js';
import { Header } from '../../organisms/Header/Header.js';
import { Text } from '../../atoms/Text/Text.js';

const meta: Meta<typeof AppShellTemplate> = {
  component: AppShellTemplate,
  title: 'Templates/AppShellTemplate',
};
export default meta;

type Story = StoryObj<typeof AppShellTemplate>;

export const Default: Story = {
  args: {
    header: (
      <Header
        productName="Storefront"
        navLinks={[{ label: 'Search', href: '/search' }]}
        onSearch={() => undefined}
      />
    ),
    children: <Text>Route content renders here.</Text>,
    footer: <Text size="sm">© Storefront</Text>,
  },
};
