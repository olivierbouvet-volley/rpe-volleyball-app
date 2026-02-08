import { useMatchStore } from './store/matchStore';
import ImportPage from './pages/ImportPage';
import AnalysisPage from './pages/AnalysisPage';

function App() {
  const match = useMatchStore((state) => state.match);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {match === null ? <ImportPage /> : <AnalysisPage />}
    </div>
  );
}

export default App;
