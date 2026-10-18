import { useState, useEffect, useRef } from 'react';
import LightGallery from 'lightgallery/react';
import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-thumbnail.css';
import 'lightgallery/css/lg-zoom.css';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
import ImageComponent from './ImageComponent.jsx';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { BsArrowsFullscreen } from 'react-icons/bs';

const ProductGallery = ({
  images,
  variants,
  selectedVariantImage,
  discount,
  zoom = true,
  productName,
}) => {
  const [imageUrls, setImageUrls] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbnailRefs = useRef([]);
  const [showVariantImage, setShowVariantImage] = useState(false);

  useEffect(() => {
    const variantImages = [];
    const seen = new Set();

    if (variants && Array.isArray(variants)) {
      variants.forEach((v) => {
        if (v.image && !seen.has(v.image)) {
          seen.add(v.image);
          variantImages.push(v.image);
        }
      });
    }

    const productImages = images || [];
    const allImages = [
      ...variantImages,
      ...productImages.filter((img) => !seen.has(img)),
    ];

    const apiUrl = import.meta.env.VITE_API_URL;
    const urls = allImages.map(
      (imageName) => `${apiUrl.replace('/api', '')}/uploads/${imageName}`,
    );
    setImageUrls(urls);
  }, [images, variants]);

  useEffect(() => {
    setShowVariantImage(!!selectedVariantImage);
  }, [selectedVariantImage]);

  useEffect(() => {
    if (selectedVariantImage && imageUrls.length > 0) {
      const apiUrl = import.meta.env.VITE_API_URL;
      const variantUrl = selectedVariantImage.startsWith('http')
        ? selectedVariantImage
        : `${apiUrl.replace('/api', '')}/uploads/${selectedVariantImage}`;
      const index = imageUrls.findIndex((url) => url === variantUrl);
      if (index !== -1) {
        setActiveIndex(index);
      }
    }
  }, [selectedVariantImage, imageUrls]);

  useEffect(() => {
    if (!showVariantImage && thumbnailRefs.current[activeIndex]) {
      thumbnailRefs.current[activeIndex].scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeIndex, showVariantImage]);

  const changeImage = (direction) => {
    setShowVariantImage(false);
    setActiveIndex((prevIndex) => {
      if (direction === 'next') {
        return prevIndex === imageUrls.length - 1 ? 0 : prevIndex + 1;
      } else {
        return prevIndex === 0 ? imageUrls.length - 1 : prevIndex - 1;
      }
    });
  };

  const plugins = zoom ? [lgThumbnail, lgZoom] : [];

  const mainImageName =
    showVariantImage && selectedVariantImage
      ? selectedVariantImage
      : imageUrls[activeIndex]
        ? imageUrls[activeIndex].replace(
            `${import.meta.env.VITE_API_URL.replace('/api', '')}/uploads/`,
            '',
          )
        : '';

  const mainImageUrl =
    showVariantImage && selectedVariantImage
      ? selectedVariantImage.startsWith('http')
        ? selectedVariantImage
        : `${import.meta.env.VITE_API_URL.replace('/api', '')}/uploads/${selectedVariantImage}`
      : imageUrls[activeIndex];

  if (imageUrls.length === 0) return <p>Loading images...</p>;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full p-1 md:p-3">
        {discount > 0 && (
          <span className="absolute md:top-3 md:left-3 bg-red-400 px-3 py-1 text-white">
            -{discount}%
          </span>
        )}

        <div className="absolute bottom-1 right-1 md:bottom-4 md:right-4 z-10 gap-1 flex justify-center items-center">
          {imageUrls.length > 1 && (
            <div className="flex items-center gap-1">
              <div className="bg-white p-2 text-xs">
                {activeIndex + 1} / {imageUrls.length}
              </div>
              <button
                className="bg-white p-2 cursor-pointer"
                onClick={() => changeImage('prev')}
                disabled={activeIndex === 0}
                aria-label="previous"
              >
                <IoIosArrowBack />
              </button>
              <button
                className="bg-white p-2 cursor-pointer"
                onClick={() => changeImage('next')}
                disabled={activeIndex === imageUrls.length - 1}
                aria-label="next"
              >
                <IoIosArrowForward />
              </button>
            </div>
          )}
        </div>

        {zoom ? (
          <LightGallery speed={500} plugins={plugins}>
            <a key="main" href={mainImageUrl} className="block">
              <ImageComponent
                imageName={mainImageName}
                altName={productName}
                className="w-full aspect-square object-cover"
                skeletonHeight={'400px'}
              />
              <button
                className="absolute md:bottom-4 bottom-1 left-1 p-3 md:left-3 bg-white rounded-full cursor-pointer"
                aria-label={'full screen'}
              >
                <BsArrowsFullscreen />
              </button>
            </a>
          </LightGallery>
        ) : (
          <div>
            <ImageComponent
              imageName={mainImageName}
              altName={productName}
              className="w-full aspect-square object-cover"
              skeletonHeight={'200px'}
            />
          </div>
        )}
      </div>

      {imageUrls.length > 1 && (
        <div className="flex items-center gap-2 w-full justify-center">
          <button
            onClick={() => changeImage('prev')}
            className="text-xl hover:text-gray-500 transition-colors duration-150 cursor-pointer"
            disabled={activeIndex === 0}
            aria-label="previous"
          >
            <IoIosArrowBack />
          </button>

          <div className="p-1 md:p-2 flex items-center justify-center-safe gap-1 overflow-x-auto w-full scrollbar-hide">
            <div className="flex gap-1 md:gap-4">
              {imageUrls.map((imgUrl, index) => {
                const imageName = imgUrl.replace(
                  `${import.meta.env.VITE_API_URL.replace('/api', '')}/uploads/`,
                  '',
                );
                return (
                  <div
                    key={index}
                    ref={(el) => (thumbnailRefs.current[index] = el)}
                    className={`cursor-pointer overflow-hidden transition-all duration-200 border-1 shrink-0 w-10 h-10 md:w-30 md:h-30 ${
                      activeIndex === index
                        ? 'primaryBorderColor scale-105'
                        : 'border-transparent opacity-80'
                    }`}
                    onClick={() => {
                      setShowVariantImage(false);
                      setActiveIndex(index);
                    }}
                  >
                    <ImageComponent
                      imageName={imageName}
                      altName={productName}
                      className="w-full aspect-square object-cover"
                      skeletonHeight={'200px'}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => changeImage('next')}
            className="text-xl hover:text-gray-500 transition-colors duration-150 cursor-pointer"
            disabled={activeIndex === imageUrls.length - 1}
            aria-label="next"
          >
            <IoIosArrowForward />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
