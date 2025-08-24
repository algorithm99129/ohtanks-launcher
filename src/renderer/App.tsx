import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import WindowFrame from './layout/WindowFrame';
import AutoResizeLayout from '@/src/renderer/hooks/AutoResizeLayout';

function Hello() {
  return (
    <WindowFrame>
      <div className="bg-black h-full">
        <h1 className="bg-gray-500 text-center text-white">
          Hi Tailwind has been integrated.
        </h1>
      </div>
    </WindowFrame>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <AutoResizeLayout>
              <Hello />
            </AutoResizeLayout>
          }
        />
      </Routes>
    </Router>
  );
}
