import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import sliderService from "../../services/sliderService";

const TextSlider = () => {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const data = await sliderService.getPublicAll();
        // Filtrer uniquement les slides actifs
        setSlides(data.filter((s) => s.active) || []);
      } catch (error) {
        console.error("Erreur chargement slider texte:", error);
      }
    };
    fetchSlides();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000); // 6 secondes
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <div className="block md:hidden w-full mb-8">
      {/* Text Slide Container - Mobile Only */}
      <div className="text-slider-container relative w-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg overflow-hidden min-h-[280px] flex flex-col items-center justify-center px-6 py-12 text-center">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/20 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-secondary/10 blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-sm mx-auto">
          {/* Title */}
          <h2 className="text-2xl font-bold text-secondary mb-4 leading-tight">
            {slide.title || "Bienvenue"}
          </h2>

          {/* Description */}
          {slide.description && (
            <p className="text-sm text-gray-600 mb-6 leading-relaxed opacity-90">
              {slide.description}
            </p>
          )}

          {/* CTA Button */}
          <button
            onClick={nextSlide}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary-dark text-secondary font-semibold rounded-lg hover:shadow-lg transition-all duration-300 active:scale-95"
          >
            Découvrir
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Slide Indicators - Bottom */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`text-slider-indicator transition-all duration-300 ${
                  index === current
                    ? "active bg-primary w-8 h-2 rounded-full"
                    : "bg-primary/40 w-2 h-2 rounded-full hover:bg-primary/60"
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Slide Counter */}
        {slides.length > 1 && (
          <div className="absolute top-4 right-4 text-xs font-semibold text-secondary/70 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full">
            {current + 1} / {slides.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextSlider;
