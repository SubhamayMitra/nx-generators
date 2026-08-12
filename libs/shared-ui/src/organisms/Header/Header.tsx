import type { ReactNode } from 'react';
import { Text } from '../../atoms/Text/Text.js';
import { SearchBar } from '../../molecules/SearchBar/SearchBar.js';
import styles from './Header.module.scss';

export interface HeaderNavLink {
  label: string;
  href: string;
}

export interface HeaderProps {
  productName: string;
  navLinks: HeaderNavLink[];
  onSearch?: (query: string) => void;
  actions?: ReactNode;
}

export function Header({
  productName,
  navLinks,
  onSearch,
  actions,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <Text as="span" size="lg">
        {productName}
      </Text>
      <nav>
        <ul className={styles.nav}>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      {onSearch ? (
        <div className={styles.searchSlot}>
          <SearchBar onSearch={onSearch} />
        </div>
      ) : null}
      {actions}
    </header>
  );
}

export default Header;
