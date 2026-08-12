import { useState, type FormEvent } from 'react';
import { Input } from '../../atoms/Input/Input.js';
import { Button } from '../../atoms/Button/Button.js';
import styles from './SearchBar.module.scss';

export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
}

export function SearchBar({
  placeholder = 'Search…',
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query.trim());
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search">
      <Input
        className={styles.input}
        aria-label="Search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Button type="submit" variant="primary">
        Search
      </Button>
    </form>
  );
}

export default SearchBar;
