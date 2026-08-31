import Headers from './Headers.jsx';
import Footer from './Footer.jsx';
import MarqueeModern from './MarqueeModern.jsx';
import { Toaster } from '@/components/ui/sonner';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <MarqueeModern />
      <Headers />
      <Toaster position="top-right" />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
