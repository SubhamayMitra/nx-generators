import './styles/main.scss';
/**
 * Exposed via Module Federation as this MFE's federated component, and
 * also what `bootstrap.tsx` renders directly for standalone dev — same
 * component either way, so behavior can't drift between the two. The shell
 * supplies the ambient <Router> in production; `bootstrap.tsx` supplies
 * its own when this MFE runs alone.
 */
export declare function App(): import('react').JSX.Element;
export default App;
//# sourceMappingURL=App.d.ts.map
