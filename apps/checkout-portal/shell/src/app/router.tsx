import { createBrowserRouter } from 'react-router';
import { RootLayout } from '../layouts/RootLayout';
import { mfeRoutes } from './routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <p>Nothing registered yet — run `nx g mfe` to add one.</p>,
      },
      ...mfeRoutes,
    ],
  },
]);
