import { useEffect, useMemo, useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiMinus } from 'react-icons/fi';
import { FaTruck } from 'react-icons/fa';

import { useNavigate } from 'react-router-dom';
import useCartStore from '../../store/useCartStore.js';
import WishlistButton from './WishlistButton.jsx';

const variantMatches = (variant, selection) =>
  Object.entries(selection).every(([name, value]) =>
    variant?.attributes?.some(
      (attr) => attr?.option?.name === name && attr.value === value,
    ),
  );

const ProductAddToCart = ({ product }) => {
  const [quantity, setQuantity] = useState(1);
  const MAX_QUANTITY = 5; // Set the limit for Cart Quantity
  const { addToCart } = useCartStore();
  const navigate = useNavigate();

  const [selectedOptions, setSelectedOptions] = useState({});
  const [validationMessage, setValidationMessage] = useState('');

  // Reset selection when product changes; auto-select single-variant products
  useEffect(() => {
    setValidationMessage('');
    if (product?.variants?.length === 1) {
      const initialSelected = {};
      product.variants[0]?.attributes?.forEach((attr) => {
        if (attr?.option?.name) {
          initialSelected[attr.option.name] = attr.value;
        }
      });
      setSelectedOptions(initialSelected);
    } else {
      setSelectedOptions({});
    }
  }, [product]);

  // Option groups, e.g. [{ name: 'Size', values: ['S','M'] }, ...]
  const optionGroups = useMemo(() => {
    const groupsMap = new Map();
    product?.variants?.forEach((variant) => {
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
  }, [product]);

  // A value stays selectable as long as some variant matches the current
  // selections combined with that value — every group is always interactive.
  const options = useMemo(() => {
    if (!product?.variants?.length) return [];
    return optionGroups.map((group) => ({
      name: group.name,
      values: group.values.map((value) => {
        const candidate = { ...selectedOptions, [group.name]: value };
        const matchingVariants = product.variants.filter((variant) =>
          variantMatches(variant, candidate),
        );
        return {
          value,
          available: matchingVariants.length > 0,
          inStock: matchingVariants.some((variant) => variant.stock !== 0),
        };
      }),
    }));
  }, [product, optionGroups, selectedOptions]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    const fullySelected = optionGroups.every(
      (group) => selectedOptions[group.name] !== undefined,
    );
    if (!fullySelected) return null;
    return (
      product.variants.find((variant) =>
        variantMatches(variant, selectedOptions),
      ) ?? null
    );
  }, [product, optionGroups, selectedOptions]);

  const missingOptions = useMemo(
    () =>
      optionGroups
        .filter((group) => selectedOptions[group.name] === undefined)
        .map((group) => group.name),
    [optionGroups, selectedOptions],
  );

  const priceRange = useMemo(() => {
    if (!product?.variants?.length) return null;
    const prices = product.variants
      .map((variant) =>
        variant.discount > 0 ? variant.discount : variant.price,
      )
      .filter((price) => typeof price === 'number' && !isNaN(price));
    if (!prices.length) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [product]);

  const hasUnavailableValues = useMemo(
    () => options.some((option) => option.values.some((v) => !v.available)),
    [options],
  );

  const handleOptionChange = (optionName, value) => {
    // Keep earlier selections only while they still form a valid combination
    // with the newly chosen value; drop the ones that conflict.
    const next = { [optionName]: value };
    for (const group of optionGroups) {
      if (group.name === optionName) continue;
      const previousValue = selectedOptions[group.name];
      if (previousValue === undefined) continue;
      const candidate = { ...next, [group.name]: previousValue };
      if (
        product.variants.some((variant) => variantMatches(variant, candidate))
      ) {
        next[group.name] = previousValue;
      }
    }
    setSelectedOptions(next);
    setValidationMessage('');
  };

  const ensureVariantSelected = () => {
    if (product.variants?.length > 0 && !selectedVariant) {
      setValidationMessage(
        missingOptions.length > 0
          ? `Please select: ${missingOptions.join(', ')}`
          : 'This combination is not available. Please choose another.',
      );
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!ensureVariantSelected()) return;
    addToCart(product, quantity, selectedVariant);
    setValidationMessage('');

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'add_to_cart',
      ecommerce: {
        currency: 'BDT',
        value:
          selectedVariant?.discount > 0
            ? selectedVariant.discount * quantity
            : selectedVariant?.price
              ? selectedVariant.price * quantity
              : product.finalDiscount > 0
                ? product.finalDiscount * quantity
                : product.finalPrice * quantity,
        items: [
          {
            item_id: product.productId,
            item_name: product.name,
            currency: 'BDT',
            discount:
              selectedVariant?.discount > 0
                ? selectedVariant.price - selectedVariant.discount
                : product.finalPrice - product.finalDiscount,
            item_variant: selectedVariant
              ? (selectedVariant?.attributes?.map((a) => a.value).join('/') ??
                'Default')
              : 'Default',
            price:
              selectedVariant?.discount > 0
                ? selectedVariant.discount
                : selectedVariant?.price ||
                  product.finalDiscount ||
                  product.finalPrice,
            quantity,
          },
        ],
      },
    });
  };

  const handleOrderOnDelivery = () => {
    if (!ensureVariantSelected()) return;
    addToCart(product, quantity, selectedVariant);
    setValidationMessage('');
    navigate('/checkout');
  };

  const handleQuantityChange = (type) => {
    if (type === 'increase' && quantity < MAX_QUANTITY) {
      setQuantity((prev) => prev + 1);
    } else if (type === 'decrease' && quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const formatPrice = (price) => {
    if (isNaN(price)) return price;
    return price.toLocaleString();
  };

  const currentStock = product.variants?.length
    ? selectedVariant?.stock
    : product.finalStock;
  const showLowStockNotice =
    typeof currentStock === 'number' && currentStock > 0 && currentStock < 20;

  return (
    <div>
      <div>
        <div className="flex flex-col gap-1.5 md:gap-3 pt-1 md:pt-0">
          <h2 className="text-base md:text-2xl leading-tight">
            {product.name}
          </h2>
          <div className="flex text-center flex-col gap-1 md:gap-2">
            {/* Without Variant Price Display */}
            {!product.variants?.length && (
              <div className="flex gap-2 items-center">
                {product.finalDiscount > 0 ? (
                  <>
                    <div className="line-through">
                      Tk. {formatPrice(Number(product.finalPrice))}
                    </div>
                    <div className="text-red-800">
                      Tk. {formatPrice(Number(product.finalDiscount))}
                    </div>
                    <div className="hidden sm:block">
                      You Save: Tk{' '}
                      {formatPrice(
                        Number(product.finalPrice - product.finalDiscount),
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-black font-medium">
                    Tk. {formatPrice(Number(product.finalPrice))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Variant Price Display */}
            {product.variants?.length > 0 && selectedVariant && (
              <div className="flex gap-1 md:gap-2 flex-wrap">
                {selectedVariant.discount > 0 ? (
                  <>
                    <div className="line-through ">
                      Tk. {formatPrice(Number(selectedVariant.price))}
                    </div>
                    <div className="text-red-800 ">
                      Tk. {formatPrice(Number(selectedVariant.discount))}
                    </div>
                    <div className="hidden sm:block ">
                      You Save: Tk{' '}
                      {formatPrice(
                        Number(
                          selectedVariant.price - selectedVariant.discount,
                        ),
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-black">
                    Tk. {formatPrice(Number(selectedVariant.price))}
                  </div>
                )}
              </div>
            )}

            {/* Price range shown until an option combination is complete */}
            {product.variants?.length > 0 && !selectedVariant && priceRange && (
              <div className="flex flex-col gap-0.5 items-center">
                <div className="flex gap-1 md:gap-2 items-center">
                  {priceRange.min === priceRange.max ? (
                    <div className="text-black font-medium">
                      Tk. {formatPrice(priceRange.min)}
                    </div>
                  ) : (
                    <>
                      <div className="text-black font-medium">
                        Tk. {formatPrice(priceRange.min)}
                      </div>
                      <span className="text-gray-500">–</span>
                      <div className="text-black font-medium">
                        Tk. {formatPrice(priceRange.max)}
                      </div>
                    </>
                  )}
                </div>
                <div className="text-gray-500 text-xs md:text-sm">
                  Select options to see the exact price
                </div>
              </div>
            )}

            {product.freeShipping && (
              <p className="text-[#2E7D31] flex gap-1 items-center text-xs md:text-sm">
                <FaTruck className="rotate-y-180 shrink-0" />
                <span className="font-bold">Free Shipping</span>
                <span className="hidden sm:inline">on this product</span>
              </p>
            )}

            {product.productCode && (
              <div
                className={
                  'bg-gray-100 px-3 py-1.5 rounded text-sm md:text-base'
                }
              >
                <strong>Product Code:</strong> {product.productCode}
              </div>
            )}
            {product.rewardPoints && (
              <div
                className={
                  'bg-gray-100 px-3 py-1.5 rounded text-sm md:text-base'
                }
              >
                Purchase & Earn: {product.rewardPoints} points.
              </div>
            )}
          </div>

          {/* Selection status: error after a failed attempt, confirmation when
              complete, gentle hint while options are still missing */}
          {product.variants?.length > 0 && (
            <div className="text-sm md:text-base">
              {validationMessage ? (
                <span className="text-red-500 font-medium">
                  {validationMessage}
                </span>
              ) : selectedVariant ? (
                <span className="text-[#2E7D31] font-medium">
                  ✓ Selected:{' '}
                  {optionGroups
                    .map(
                      (group) =>
                        `${group.name}: ${selectedOptions[group.name]}`,
                    )
                    .join('  ·  ')}
                </span>
              ) : (
                <span className="text-gray-500">
                  Please select {missingOptions.join(', ')} to continue.
                </span>
              )}
            </div>
          )}

          {hasUnavailableValues && (
            <p className="text-xs text-gray-500">
              Crossed-out options are not available with your current selection.
            </p>
          )}

          {options.map((option) => {
            const isMissing =
              validationMessage && selectedOptions[option.name] === undefined;
            return (
              <div key={option.name} className={'flex flex-col gap-1.5'}>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{option.name}</h2>
                  {selectedOptions[option.name] !== undefined && (
                    <span className="text-gray-600 text-sm md:text-base">
                      :{' '}
                      <span className="primaryTextColor font-medium">
                        {selectedOptions[option.name]}
                      </span>
                    </span>
                  )}
                  {isMissing && (
                    <span className="text-red-500 text-xs font-semibold">
                      Required
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {option.values.map(({ value, available, inStock }) => {
                    const isSelected = selectedOptions[option.name] === value;
                    let classes =
                      'px-3 py-1.5 md:px-4 md:py-2 rounded-full border text-sm md:text-base transition-all duration-150';
                    if (!available) {
                      classes +=
                        ' bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed';
                    } else if (isSelected) {
                      classes +=
                        ' primaryBgColor accentTextColor border-transparent shadow-sm';
                    } else if (!inStock) {
                      classes +=
                        ' bg-white border-dashed border-gray-300 text-gray-500 cursor-pointer';
                    } else {
                      classes +=
                        ' bg-white border-gray-300 text-gray-800 hover:border-[var(--primaryColor)] hover:text-[var(--primaryColor)] cursor-pointer';
                    }
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleOptionChange(option.name, value)}
                        disabled={!available}
                        aria-pressed={isSelected}
                        title={
                          available
                            ? undefined
                            : 'Not available with your current selection'
                        }
                        className={classes}
                      >
                        <span className={!inStock ? 'line-through' : ''}>
                          {value}
                        </span>
                        {available && !inStock && (
                          <span className="block text-[10px] leading-tight opacity-80">
                            Sold out
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className={'flex flex-wrap gap-2 md:gap-4 items-center mt-2'}>
            <div
              className={'rounded flex items-center justify-between shrink-0'}
            >
              <button
                className={
                  'primaryBgColor accentTextColor px-2 py-2 md:py-3 rounded-l cursor-pointer'
                }
                onClick={() => handleQuantityChange('decrease')}
                disabled={
                  product.variants?.length > 0 &&
                  (!selectedVariant || selectedVariant.stock === 0)
                }
              >
                <FiMinus />
              </button>
              <span className={'px-3 py-1 md:py-2 bg-gray-200'}>
                {quantity}
              </span>
              <button
                className={
                  'primaryBgColor accentTextColor px-2 py-2 md:py-3 rounded-r cursor-pointer'
                }
                onClick={() => handleQuantityChange('increase')}
                disabled={
                  (product.variants?.length > 0 && !selectedVariant) ||
                  quantity >= MAX_QUANTITY ||
                  selectedVariant?.stock === 0
                }
              >
                <FaPlus />
              </button>
            </div>
            {selectedVariant?.stock === 0 ? (
              <button className="text-red-600 w-44 font-semibold" disabled>
                Stock Out
              </button>
            ) : (
              <button
                className="primaryBgColor accentTextColor px-2 py-1 md:py-2 rounded flex-1 min-w-[120px] cursor-pointer"
                onClick={handleAddToCart}
              >
                ADD TO CART
              </button>
            )}
            <WishlistButton
              product={product}
              className={'primaryBgColor accentTextColor px-2 py-1 shrink-0'}
            />
          </div>
          {showLowStockNotice && (
            <div className="primaryTextColor text-sm font-semibold">
              Only {currentStock} left!
            </div>
          )}
          {selectedVariant?.stock !== 0 && (
            <div className={'flex items-center justify-center'}>
              <button
                className="primaryBgColor flex-1   accentTextColor px-2 py-1 md:py-2 rounded cursor-pointer"
                onClick={handleOrderOnDelivery}
              >
                Order With Cash On Delivery
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductAddToCart;
