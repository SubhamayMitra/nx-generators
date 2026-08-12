import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.scss';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={[styles.input, className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

export default Input;
