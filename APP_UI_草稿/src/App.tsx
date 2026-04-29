import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { DietProvider, useDiet } from './lib/store';
import ProfileSetup from './components/ProfileSetup';
import DailySummary from './components/DailySummary';
import AddFood from './components/AddFood';
import BodyStats from './components/BodyStats';
import NutritionStats from './components/NutritionStats';
import { Home, PlusCircle, User, Weight, BarChart3 } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  return (
    <DietProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </DietProvider>
  );
}

function AppContent() {
  const { userProfile } = useDiet();

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center sm:p-4">
        <div className="w-full max-w-md bg-white min-h-screen sm:min-h-[800px] sm:max-h-[90vh] sm:rounded-3xl sm:shadow-2xl overflow-y-auto flex items-center justify-center p-4">
          <ProfileSetup />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-start sm:items-center sm:p-4">
      <div className="w-full max-w-md bg-slate-50 min-h-screen sm:min-h-[800px] sm:max-h-[90vh] sm:rounded-3xl sm:shadow-2xl overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto pb-24 scroll-smooth">
          <Routes>
            <Route path="/" element={<div className="p-4"><DailySummary /></div>} />
            <Route path="/add" element={<AddFood />} />
            <Route path="/body" element={<div className="p-4"><BodyStats /></div>} />
            <Route path="/stats" element={<div className="p-4"><NutritionStats /></div>} />
            <Route path="/profile" element={<div className="p-4"><ProfileSetup /></div>} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

function BottomNav() {
  const location = useLocation();
  // Hide bottom nav on add page to give more space
  if (location.pathname === '/add') return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
      <div className="flex justify-around items-center px-4 py-2">
        <NavItem to="/" icon={<Home />} label="今日" isActive={location.pathname === '/'} />
        <NavItem to="/stats" icon={<BarChart3 />} label="統計" isActive={location.pathname === '/stats'} />
        <Link 
          to="/add" 
          className="relative -top-6 bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-200 hover:bg-blue-700 transition-transform active:scale-95 border-4 border-white"
        >
          <PlusCircle className="w-7 h-7" />
        </Link>
        <NavItem to="/body" icon={<Weight />} label="身體" isActive={location.pathname === '/body'} />
        <NavItem to="/profile" icon={<User />} label="個人" isActive={location.pathname === '/profile'} />
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, isActive }: { to: string, icon: React.ReactNode, label: string, isActive: boolean }) {
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center p-2 transition-colors",
        isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6 mb-1' })}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

