import { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck } from 'lucide-react';
import useCartStore from '../../store/useCartStore.js';
import { Link } from 'react-router-dom';
import { FaTrash, FaWhatsapp } from 'react-icons/fa';
import { getWhatsAppLink } from '@/utils/brand';
import ImageComponent from './ImageComponent.jsx';
import { FiMinus } from 'react-icons/fi';
import { FaPlus } from 'react-icons/fa6';
import emptyCart from '../../assets/empty_cart.png';

const Cart = ({ onCloseCartMenu }) => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const [freeDeliveryAmount, setFreeDeliveryAmount] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  // Fetch free delivery threshold
  useEffect(() => {
    const fetchAmount = async () => {
      try {
        const res = await axios.get(`${apiUrl}/getFreeDeliveryAmount`);
        if (res.data?.success) {
          setFreeDeliveryAmount(res.data?.data?.value);
        }
      } catch (err) {
        console.error('Failed to fetch free delivery amount:', err.message);
      }
    };

    fetchAmount();
  }, [apiUrl]);

  // Calculate the total price of all items in the cart
  const totalAmount = cart.reduce((total, item) => {
    const price =
      item.discountPrice > 0 ? item.discountPrice : item.originalPrice;
    return total + price * item.quantity;
  }, 0);

  // Format the totalAmount with commas for better readability
  const formattedTotalAmount = (amount) => {
    return Number(amount).toLocaleString();
  };

  // console.table(cart);

  return (
    <div className="py-3">
      {cart.length === 0 ? (
        <div className="flex items-center justify-center h-[800px] p-4">
          <div className="flex flex-col items-center text-center">
            <img src={emptyCart} alt="Empty Cart" className="w-48 h-auto" />
            <p>There are no more items in your cart!</p>

            <Link to={`/shop`}>
              <button
                className="primaryBgColor accentTextColor px-6 py-2 rounded mt-4 cursor-pointer"
                onClick={onCloseCartMenu}
              >
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.variantId}`}
              className="grid grid-cols-2 gap-3 border-t border-dashed py-2"
            >
              {/*Product Thumbnail*/}

              <Link to={`/product/${item.slug}`}>
                <ImageComponent
                  imageName={item.thumbnail}
                  altName={item.name}
                  className="object-cover"
                />
              </Link>

              <div className="flex-1">
                <div className="flex flex-col gap-2">
                  <Link to={`/product/${item.slug}`}>
                    <h3 className="line-clamp-2 overflow-hidden text-ellipsis hover:underline">
                      {item.name}
                    </h3>
                  </Link>

                  {/*Original Price*/}
                  <p>
                    Price: Tk.{' '}
                    {formattedTotalAmount(item.originalPrice * item.quantity)}
                  </p>
                  {/*Discount Price*/}
                  {item.discountPrice > 0 && (
                    <p className={'text-red-800'}>
                      Offer Price: Tk.{' '}
                      {formattedTotalAmount(item.discountPrice * item.quantity)}
                    </p>
                  )}
                  {/*Discount Amount*/}
                  {item.discountPrice > 0 && (
                    <p>
                      You Save: Tk.{' '}
                      {formattedTotalAmount(
                        item.originalPrice - item.discountPrice,
                      )}
                    </p>
                  )}
                  {item.variant !== 'Default' && <p>Variant: {item.variant}</p>}
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center">
                      {/*Decrease Button*/}
                      <button
                        className="primaryBgColor accentTextColor px-2 py-2 rounded-l cursor-pointer"
                        onClick={() =>
                          updateQuantity(
                            item.productId, // <-- FIXED
                            item.variant,
                            item.quantity - 1,
                          )
                        }
                        disabled={item.quantity <= 1}
                      >
                        <FiMinus />
                      </button>
                      <span className={'px-3 py-1 bg-gray-200'}>
                        {item.quantity}
                      </span>
                      {/*Increase Button*/}
                      <button
                        className="primaryBgColor accentTextColor px-2 py-2 rounded-r cursor-pointer"
                        onClick={() =>
                          updateQuantity(
                            item.productId, // <-- FIXED
                            item.variant,
                            item.quantity + 1,
                          )
                        }
                        disabled={item.quantity >= 5}
                      >
                        <FaPlus />
                      </button>
                    </div>
                    {/*Delete Button*/}
                    <div>
                      <button
                        onClick={() =>
                          removeFromCart(item.productId, item.variant)
                        } // <-- FIXED
                        className="text-red-500 text-lg cursor-pointer"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/*Free Delivery Tracker — ফ্রি ডেলিভারি ট্র্যাকার*/}
          {freeDeliveryAmount > 1 && (
            <div className="rounded-2xl border border-[#2E7D31]/15 bg-[#F4FAF4] p-4">
              {totalAmount >= freeDeliveryAmount ? (
                <p className="flex items-center gap-2 text-base md:text-lg font-semibold text-[#2E7D31]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2E7D31] text-white">
                    <Truck className="size-4" aria-hidden="true" />
                  </span>
                  ফ্রি ডেলিভারি অনলক হয়েছে — শিপিং খরচ আমরাই বহন করছি
                </p>
              ) : (
                <>
                  <p className="flex flex-col gap-1 text-base md:text-lg font-medium text-gray-700">
                    <span className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2E7D31]/10 text-[#2E7D31]">
                        <Truck className="size-4" aria-hidden="true" />
                      </span>
                      ফ্রি ডেলিভারি পেতে আর
                    </span>
                    <span className="pl-10 font-bold text-gray-900">
                      Tk.{' '}
                      {formattedTotalAmount(freeDeliveryAmount - totalAmount)}{' '}
                      যোগ করুন
                    </span>
                  </p>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#2E7D31]/10">
                    <div
                      className="h-full rounded-full bg-[#2E7D31] transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((totalAmount / freeDeliveryAmount) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    সাবটোটাল: Tk. {formattedTotalAmount(totalAmount)} / Tk.{' '}
                    {formattedTotalAmount(freeDeliveryAmount)}
                  </p>
                </>
              )}
            </div>
          )}

          {/*WhatsApp Contact — হোয়াটসঅ্যাপ যোগাযোগ*/}
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-[#28D366]/30 bg-[#F0FDF4] p-4 text-base md:text-lg font-medium text-gray-800 transition-colors hover:bg-[#E8FBEF] cursor-pointer"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#28D366] text-white">
              <FaWhatsapp className="size-4" aria-hidden="true" />
            </span>
            <span>
              অর্ডার সংক্রান্ত সমস্যা বা যেকোনো জিজ্ঞাসায় হোয়াটসঅ্যাপ যোগাযোগ
              করুন
            </span>
          </a>

          <div className="flex justify-between py-4 items-center gap-2 border-b border-t border-dashed">
            <h1 className="text-center">Totals</h1>
            <span className="text-center">
              Tk {formattedTotalAmount(totalAmount)}
            </span>
          </div>

          <button
            onClick={clearCart}
            className="bg-red-500 text-white py-2 px-4 rounded cursor-pointer"
          >
            Clear Cart
          </button>
          <Link
            to="/checkout"
            className="primaryBgColor accentTextColor text-center py-2 px-4 rounded"
            onClick={onCloseCartMenu}
          >
            Proceed to Checkout
          </Link>
        </div>
      )}
    </div>
  );
};

export default Cart;
