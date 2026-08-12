import type { ElementType, HTMLAttributes } from 'react';
import styles from './Text.module.scss';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  muted?: boolean;
}

export function Text({
  as: Component = 'span',
  size = 'md',
  muted = false,
  className,
  ...rest
}: TextProps) {
  const classes = [
    styles.text,
    styles[size],
    muted ? styles.muted : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <Component className={classes} {...rest} />;
}

export default Text;
