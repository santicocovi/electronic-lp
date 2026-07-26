"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  videoUrl: string;
  title: string;
  subtitle: string;
  cta: string;
}

export function Hero({ videoUrl, title, subtitle, cta }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <section className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden">
      {/* Video */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-3xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-brand-blue-light text-sm font-semibold tracking-[0.2em] uppercase mb-4"
          >
            Electronic LP
          </motion.p>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight text-balance mb-6 leading-[1.05]">
            {title}
          </h1>

          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/products">
              <Button
                size="lg"
                className="rounded-full px-8 bg-white text-gray-900 hover:bg-gray-100 font-semibold gap-2 shadow-xl"
              >
                {cta}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/products?filter=sale">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 border-white/40 text-white hover:bg-white/10 font-semibold backdrop-blur-sm"
              >
                Ver ofertas
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ChevronDown className="w-6 h-6 text-white/60" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
