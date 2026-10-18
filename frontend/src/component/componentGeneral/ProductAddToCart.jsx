import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaTruck } from 'react-icons/fa6';
import {
  FiMinus,
  FiShoppingBag,
  FiCheckCircle,
  FiInfo,
  FiGift,
} from 'react-icons/fi';
import { Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../../store/useCartStore.js';
import WishlistButton from './WishlistButton.jsx';
const MAX_QUANTITY = 5;

const variantMatches = (variant, selection) =>
  Object.entries(selection).every(([name, value]) =>
    variant?.attributes?.some(
      (attr) => attr?.option?.name === name && attr.value === value,
    ),
  );

const formatPrice = (price) => {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return price;
  return numericPrice.toLocaleString('en-BD');
};

const formatAmount = (value) => Number(value).toLocaleString();

const ProductAddToCart = ({ product, onVariantChange }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [validationMessage, setValidationMessage] = useState('');
  const [freeDeliveryAmount, setFreeDeliveryAmount] = useState(null);
  const { addToCart, cart } = useCartStore();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  const variants = product?.variants ?? [];
  const hasVariants = variants.length > 0;

  useEffect(() => {
    setQuantity(1);
    setValidationMessage('');

    if (variants.length > 0) {
      const initialSelected = {};
      variants[0]?.attributes?.forEach((attr) => {
        if (attr?.option?.name) initialSelected[attr.option.name] = attr.value;
      });
      setSelectedOptions(initialSelected);
    } else {
      setSelectedOptions({});
    }
  }, [product]);

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

  const optionGroups = useMemo(() => {
    const groupsMap = new Map();

    variants.forEach((variant) => {
      variant?.attributes?.forEach((attr) => {
        const name = attr?.option?.name;
        if (!name) return;
        if (!groupsMap.has(name)) groupsMap.set(name, new Set());
        groupsMap.get(name).add(attr.value);
      });
    });

    return Array.from(groupsMap, ([name, values]) => ({
      name,
      values: Array.from(values),
    }));
  }, [variants]);

  const options = useMemo(() => {
    return optionGroups.map((group) => ({
      name: group.name,
      values: group.values.map((value) => {
        const candidate = { ...selectedOptions, [group.name]: value };
        const matchingVariants = variants.filter((variant) =>
          variantMatches(variant, candidate),
        );

        return {
          value,
          available: matchingVariants.length > 0,
          inStock: matchingVariants.some(
            (variant) => Number(variant.stock) > 0,
          ),
        };
      }),
    }));
  }, [variants, optionGroups, selectedOptions]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;

    const fullySelected = optionGroups.every(
      (group) => selectedOptions[group.name] !== undefined,
    );
    if (!fullySelected) return null;

    return (
      variants.find((variant) => variantMatches(variant, selectedOptions)) ??
      null
    );
  }, [hasVariants, variants, optionGroups, selectedOptions]);

  useEffect(() => {
    if (onVariantChange && selectedVariant) {
      onVariantChange(selectedVariant);
    } else if (onVariantChange && !hasVariants) {
      onVariantChange(null);
    }
  }, [selectedVariant, hasVariants, onVariantChange]);

  const missingOptions = useMemo(
    () =>
      optionGroups
        .filter((group) => selectedOptions[group.name] === undefined)
        .map((group) => group.name),
    [optionGroups, selectedOptions],
  );

  const priceRange = useMemo(() => {
    if (!hasVariants) return null;

    const prices = variants
      .map((variant) =>
        Number(variant.discount) > 0
          ? Number(variant.discount)
          : Number(variant.price),
      )
      .filter((price) => Number.isFinite(price) && price >= 0);

    if (!prices.length) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [hasVariants, variants]);

  const handleOptionChange = (optionName, value) => {
    const next = { [optionName]: value };

    // Keep existing selections only if they remain a valid combination.
    for (const group of optionGroups) {
      if (group.name === optionName) continue;
      const previousValue = selectedOptions[group.name];
      if (previousValue === undefined) continue;

      const candidate = { ...next, [group.name]: previousValue };
      if (variants.some((variant) => variantMatches(variant, candidate))) {
        next[group.name] = previousValue;
      }
    }

    setSelectedOptions(next);
    setValidationMessage('');
    setQuantity(1);
  };

  const ensureVariantSelected = () => {
    if (hasVariants && !selectedVariant) {
      setValidationMessage(
        missingOptions.length
          ? `Please select: ${missingOptions.join(', ')}`
          : 'This combination is unavailable. Please choose another option.',
      );
      return false;
    }

    if (hasVariants && Number(selectedVariant?.stock) <= 0) {
      setValidationMessage('Sorry, this option is currently out of stock.');
      return false;
    }

    if (!hasVariants && Number(product?.finalStock) <= 0) {
      setValidationMessage('Sorry, this product is currently out of stock.');
      return false;
    }

    setValidationMessage('');
    return true;
  };

  const getUnitPrice = () => {
    if (selectedVariant) {
      return Number(selectedVariant.discount) > 0
        ? Number(selectedVariant.discount)
        : Number(selectedVariant.price);
    }

    return Number(product?.finalDiscount) > 0
      ? Number(product.finalDiscount)
      : Number(product?.finalPrice);
  };

  const cartTotal = cart.reduce((total, item) => {
    const price =
      item.discountPrice > 0 ? item.discountPrice : item.originalPrice;
    return total + price * item.quantity;
  }, 0);

  const handleAddToCart = () => {
    if (!ensureVariantSelected()) return;

    addToCart(product, quantity, selectedVariant);

    // Keep the existing analytics event structure.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'add_to_cart',
      ecommerce: {
        currency: 'BDT',
        value: getUnitPrice() * quantity,
        items: [
          {
            item_id: product.productId,
            item_name: product.name,
            currency: 'BDT',
            discount: selectedVariant
              ? Math.max(
                  0,
                  Number(selectedVariant.price) -
                    Number(selectedVariant.discount || 0),
                )
              : Math.max(
                  0,
                  Number(product.finalPrice) -
                    Number(product.finalDiscount || 0),
                ),
            item_variant: selectedVariant
              ? selectedVariant.attributes
                  ?.map((attr) => attr.value)
                  .join('/') || 'Default'
              : 'Default',
            price: getUnitPrice(),
            quantity,
          },
        ],
      },
    });
  };

  const handleOrderOnDelivery = () => {
    if (!ensureVariantSelected()) return;
    addToCart(product, quantity, selectedVariant);
    navigate('/checkout');
  };

  const isOutOfStock = hasVariants
    ? selectedVariant != null && Number(selectedVariant.stock) <= 0
    : Number(product?.finalStock) <= 0;
  const canIncrease =
    quantity < MAX_QUANTITY &&
    (hasVariants
      ? Boolean(selectedVariant) && Number(selectedVariant.stock) > quantity
      : !(typeof product?.finalStock === 'number') ||
        product.finalStock > quantity);

  const originalPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product?.finalPrice);
  const currentPrice = getUnitPrice();
  const hasDiscount =
    Number.isFinite(originalPrice) && currentPrice < originalPrice;
  const savings = hasDiscount ? originalPrice - currentPrice : 0;

  return (
    <section className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-2 lg:p-">
      <div className="space-y-5">
        {/* Product title and price */}
        <header className="space-y-3">
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-gray-900 sm:text-xl">
            {product?.name}
          </h2>

          <div className="space-y-2">
            {hasVariants && !selectedVariant && priceRange ? (
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                    Tk. {formatPrice(priceRange.min)}
                  </span>
                  {priceRange.max !== priceRange.min && (
                    <>
                      <span className="text-gray-400">–</span>
                      <span className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                        Tk. {formatPrice(priceRange.max)}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Select your options to see the exact price.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                  Tk. {formatPrice(currentPrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm text-gray-400 line-through sm:text-base">
                      Tk. {formatPrice(originalPrice)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Save Tk. {formatPrice(savings)}
                    </span>
                  </>
                )}
              </div>
            )}

            {product?.freeShipping && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <FaTruck aria-hidden="true" />
                <span>Free shipping on this product</span>
              </div>
            )}
          </div>
        </header>

        {/* Variant selection */}
        {hasVariants && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Choose your options
              </h3>
              <span className="text-xs text-gray-500">Required</span>
            </div>

            {options.map((option) => {
              const isMissing =
                Boolean(validationMessage) &&
                selectedOptions[option.name] === undefined;

              return (
                <fieldset key={option.name} className="space-y-2">
                  <legend className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-800">
                    {option.name}
                    {selectedOptions[option.name] !== undefined && (
                      <span className="font-semibold text-[var(--primaryColor)]">
                        {selectedOptions[option.name]}
                      </span>
                    )}
                    {isMissing && (
                      <span className="text-xs font-medium text-red-600">
                        Please select
                      </span>
                    )}
                  </legend>

                  <div className="grid grid-cols-2 gap-3">
                    {option.values.map(({ value, available, inStock }) => {
                      const isSelected = selectedOptions[option.name] === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleOptionChange(option.name, value)}
                          disabled={!available}
                          aria-pressed={isSelected}
                          className={[
                            'relative min-h-10 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primaryColor)] focus-visible:ring-offset-2',
                            isSelected
                              ? 'border-[var(--primaryColor)] bg-[var(--primaryColor)] text-white shadow-sm'
                              : !available
                                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
                                : !inStock
                                  ? 'cursor-pointer border-dashed border-gray-300 bg-white text-gray-400'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-[var(--primaryColor)] hover:bg-gray-50',
                          ].join(' ')}
                          title={
                            !available
                              ? 'Not available with the current selection'
                              : !inStock
                                ? 'Currently sold out'
                                : undefined
                          }
                        >
                          <span
                            className={
                              !inStock && !isSelected ? 'line-through' : ''
                            }
                          >
                            {value}
                          </span>
                          {!inStock && available && (
                            <span className="ml-1.5 text-[10px] font-normal no-underline">
                              Sold out
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}

            <div aria-live="polite" className="text-sm">
              {validationMessage ? (
                <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-red-700">
                  <FiInfo className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{validationMessage}</span>
                </p>
              ) : selectedVariant ? (
                <p className="flex items-center gap-2 text-emerald-700">
                  <FiCheckCircle aria-hidden="true" />
                  <span>
                    Option selected
                    {selectedVariant.stock > 0 &&
                      ` · ${selectedVariant.stock} available`}
                  </span>
                </p>
              ) : (
                <p className="text-gray-500">
                  Select {missingOptions.join(' and ')} to continue.
                </p>
              )}
            </div>
          </div>
        )}

        {!hasVariants && validationMessage && (
          <p
            aria-live="polite"
            className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {validationMessage}
          </p>
        )}

        {isOutOfStock && (
          <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
            This option is currently out of stock.
          </p>
        )}

        {/* Quantity and purchase actions */}
        <div className="space-y-3 border-t border-gray-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700">Quantity</span>
            <div
              className="inline-flex h-11 items-center rounded-lg border border-gray-300 bg-white"
              aria-label="Product quantity"
            >
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                disabled={quantity <= 1}
                className="grid h-10 w-10 place-items-center rounded-l-lg text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                <FiMinus aria-hidden="true" />
              </button>
              <span
                className="min-w-10 px-2 text-center text-sm font-semibold text-gray-900"
                aria-live="polite"
              >
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() =>
                  setQuantity((prev) => Math.min(MAX_QUANTITY, prev + 1))
                }
                disabled={!canIncrease || isOutOfStock}
                className="grid h-10 w-10 place-items-center rounded-r-lg text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                <FaPlus aria-hidden="true" className="text-xs" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primaryColor)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primaryColor)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
            >
              <FiShoppingBag aria-hidden="true" className="text-lg" />
              <span>Add to Cart</span>
            </button>

            <WishlistButton
              product={product}
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 text-gray-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            />
          </div>

          <button
            type="button"
            onClick={handleOrderOnDelivery}
            disabled={isOutOfStock}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--primaryColor)] bg-white px-4 py-3 text-sm font-semibold text-[var(--primaryColor)] transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primaryColor)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
          >
            Order with Cash on Delivery
          </button>

          <p className="text-center text-xs leading-relaxed text-gray-500 mb-5">
            Secure checkout · Maximum {MAX_QUANTITY} items per purchase
          </p>
        </div>
      </div>

      {/* Free Delivery Tracker */}
      {freeDeliveryAmount > 1 && (
        <div className="rounded-2xl border border-[#2E7D31]/15 bg-[#F4FAF4] p-4">
          {cartTotal >= freeDeliveryAmount ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-[#2E7D31]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2E7D31] text-white">
                <Truck className="size-4" aria-hidden="true" />
              </span>
              Free delivery unlocked — shipping is on us
            </p>
          ) : (
            <>
              <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2E7D31]/10 text-[#2E7D31]">
                  <Truck className="size-4" aria-hidden="true" />
                </span>
                Add{' '}
                <span className="font-bold text-gray-900">
                  Tk. {formatAmount(freeDeliveryAmount - cartTotal)}
                </span>{' '}
                more to get free delivery
              </p>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#2E7D31]/10">
                <div
                  className="h-full rounded-full bg-[#2E7D31] transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((cartTotal / freeDeliveryAmount) * 100),
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Subtotal: Tk. {formatAmount(cartTotal)} of Tk.{' '}
                {formatAmount(freeDeliveryAmount)}
              </p>
            </>
          )}
        </div>
      )}

      {/* Product details */}
      {(product?.productCode || product?.rewardPoints) && (
        <div className="mt-5 grid grid-cols-1 gap-3 ">
          {product?.productCode && (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-gray-300">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <FiInfo className="text-lg" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Product Code
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                  {product.productCode}
                </p>
              </div>
            </div>
          )}

          {product?.rewardPoints > 0 && (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 transition-colors hover:border-amber-300">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <FiGift className="text-lg" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Reward Points
                </p>
                <p className="mt-1 text-sm font-bold text-amber-900">
                  {Number(product.rewardPoints).toLocaleString()} points
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ProductAddToCart;
