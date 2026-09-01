import { FaWhatsapp } from 'react-icons/fa';
import { getWhatsAppLink } from '@/utils/brand';

const WhatsAppButton = () => {
  const handleClick = () => {
    const link = getWhatsAppLink();
    window.open(link, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-2 text-[#28D366] p-3 z-50 cursor-pointer"
      aria-label="Chat on WhatsApp"
    >
      <FaWhatsapp className="w-12 h-12" />
    </button>
  );
};

export default WhatsAppButton;
