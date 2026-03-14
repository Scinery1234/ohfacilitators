import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50 text-stone-800 min-w-0">
      <Navbar />
      <main className="flex-grow min-w-0 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
