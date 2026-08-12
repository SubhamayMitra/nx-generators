import type { ReactNode } from 'react';
import styles from './AppShellTemplate.module.scss';

export interface AppShellTemplateProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * The page-level layout every shell's `RootLayout` renders into: persistent
 * header slot, a main content region for the router's `<Outlet />`, and an
 * optional footer. Keeps chrome layout/spacing consistent across every
 * shell without each one re-implementing it.
 */
export function AppShellTemplate({
  header,
  children,
  footer,
}: AppShellTemplateProps) {
  return (
    <div className={styles.shell}>
      {header}
      <main className={styles.main}>{children}</main>
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </div>
  );
}

export default AppShellTemplate;
