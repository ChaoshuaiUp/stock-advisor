// App 根组件 — 路由配置
import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from '@/context/AppContext';
import { ALL_STOCKS } from '@/data/stocks';
import Navbar from '@/components/Navbar';

const Home = lazy(() => import('@/pages/Home'));
const Search = lazy(() => import('@/pages/Search'));
const StockDetail = lazy(() => import('@/pages/StockDetail'));
const Compare = lazy(() => import('@/pages/Compare'));

function AppContent() {
  const { dispatch } = useAppContext();

  useEffect(() => {
    dispatch({ type: 'SET_STOCKS', payload: ALL_STOCKS });
  }, [dispatch]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/stock/:code" element={<StockDetail />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
