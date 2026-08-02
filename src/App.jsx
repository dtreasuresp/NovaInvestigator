import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AnalysisProvider } from './state/AnalysisContext.jsx';
import AppLayout from './app/layout.jsx';
import SetupWizard from './setup/App.jsx';
import './styles.css';

const ContextPage = lazy(() => import('./app/(pages)/context/index.jsx'));
const SummaryPage = lazy(() => import('./app/(pages)/summary/index.jsx'));
const EfiPage = lazy(() => import('./app/(pages)/efi/index.jsx'));
const EfePage = lazy(() => import('./app/(pages)/efe/index.jsx'));
const DafoPage = lazy(() => import('./app/(pages)/dafo/index.jsx'));
const QspmPage = lazy(() => import('./app/(pages)/qspm/index.jsx'));
const CamePage = lazy(() => import('./app/(pages)/came/index.jsx'));

function PageFallback() {
  return <div className="route-loading">Cargando módulo...</div>;
}

export default function App() {
  return (
    <AnalysisProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
          <Route element={<AppLayout />}>
            <Route path="/app" element={<Navigate to="/app/context" replace />} />
            <Route path="/app/context" element={<ContextPage />} />
            <Route path="/app/summary" element={<SummaryPage />} />
            <Route path="/app/efi" element={<EfiPage />} />
            <Route path="/app/efe" element={<EfePage />} />
            <Route path="/app/dafo" element={<DafoPage />} />
            <Route path="/app/qspm" element={<QspmPage />} />
            <Route path="/app/came" element={<CamePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/app/context" replace />} />
        </Routes>
      </Suspense>
    </AnalysisProvider>
  );
}
