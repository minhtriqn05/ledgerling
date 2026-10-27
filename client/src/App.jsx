import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import StyleGuidePage from './pages/StyleGuidePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* Temporary page to review the design tokens. Only available in dev mode. */}
      {import.meta.env.DEV && <Route path="/style-guide" element={<StyleGuidePage />} />}
    </Routes>
  );
}
