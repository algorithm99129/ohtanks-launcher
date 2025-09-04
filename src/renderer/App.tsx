import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import AutoResizeLayout from '@/src/renderer/hooks/AutoResizeLayout';
import Loader from './pages/Loader';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <AutoResizeLayout>
              <Loader />
            </AutoResizeLayout>
          }
        />
      </Routes>
    </Router>
  );
}
