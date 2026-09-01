import Headers from './Headers.jsx';
import Footer from './Footer.jsx';
import MarqueeModern from './MarqueeModern.jsx';
import { Toaster } from '@/components/ui/sonner';
import WhatsAppButton from '@/component/componentGeneral/WhatsAppButton.jsx';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <MarqueeModern />
      <Headers />
      <Toaster position="top-right" />
      <main className="flex-grow">{children}</main>
      <WhatsAppButton />
      <Footer />
    </div>
  );
};

export default Layout;
