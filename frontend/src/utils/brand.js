import useGeneralInfoStore from '@/store/GeneralInfoStore';

export const getWhatsAppLink = () => {
  const { GeneralInfoList } = useGeneralInfoStore.getState();
  const phone = GeneralInfoList?.WhatsappNumber?.replace(/[^0-9]/g, '');
  return `https://wa.me/${phone}`;
};
