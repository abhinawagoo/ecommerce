"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/types/product";

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
        No Images
      </div>
    );
  }

  const selectedImage = images[selectedIndex];
  const total = images.length;

  function prev() {
    setSelectedIndex((i) => (i - 1 + total) % total);
  }

  function next() {
    setSelectedIndex((i) => (i + 1) % total);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return; // ignore tiny taps
    if (delta < 0) next();
    else prev();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main Image */}
      <div
        className="relative aspect-square bg-muted rounded-lg overflow-hidden group select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={selectedImage.url}
          alt={selectedImage.alt ?? productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />

        {/* Prev / Next arrows — visible on hover (desktop) or always on mobile */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 text-gray-800 shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity md:flex hidden"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white/80 text-gray-800 shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity md:flex hidden"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Mobile: always-visible dot indicators + tap-area arrows */}
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-0 top-0 h-full w-1/3 z-10 md:hidden"
            />
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-0 top-0 h-full w-1/3 z-10 md:hidden"
            />

            {/* Dot indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === selectedIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails (shown when >1 image) */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={`relative w-16 h-16 rounded-md overflow-hidden shrink-0 border-2 transition-colors ${
                index === selectedIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt ?? `${productName} ${index + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
