
'use client';

import Image from 'next/image';

export function ThreeScenePlaceholder() {
  return (
    <div
      className="relative w-full h-[400px] md:h-[500px] rounded-2xl shadow-2xl overflow-hidden border border-primary/10 group bg-slate-900"
      aria-label="Feature highlight placeholder"
    >
      {/* Placeholder image */}
      <Image
        src="https://placehold.co/1200x800.png" 
        alt="Abstract technology background"
        fill
        className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105 opacity-30"
        data-ai-hint="abstract technology"
        priority
      />

      {/* Overlay with text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-t from-black/50 to-transparent">
        {/* TODO: Add Framer Motion wrapper here for entrance animation if desired */}
        <div className="text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4 drop-shadow-lg">
            Innovative Proctoring Solutions
          </h3>
          <p className="text-md md:text-lg text-slate-200 max-w-md md:max-w-lg mx-auto drop-shadow-sm">
            Secure, reliable, and intelligent online examination platform.
          </p>
          {/* You can add a button or link here if needed later */}
          {/*
          <div className="mt-6 md:mt-8">
            <Button variant="outline" className="text-white border-white/50 hover:bg-white/10 hover:border-white">
              Learn More (Placeholder)
            </Button>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
