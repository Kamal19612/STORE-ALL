import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import sliderService from "../../../services/sliderService";

/**
 * Carousel bannières — copie du markup/CSS sucre-store/index.php
 * (slider-container, slide, w-full h-auto object-cover, max-height 400px).
 */
export default function AlibabaSlider({ className = "mb-4" }) {
  const { storeCode } = useParams();
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const data = await sliderService.getPublicAll();
        setSlides((data || []).filter((s) => s.active));
      } catch (error) {
        console.error("Erreur chargement slider:", error);
      }
    };
    fetchSlides();
  }, [storeCode]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const showSlide = (index) => {
    setCurrentSlide((index + slides.length) % slides.length);
  };

  if (slides.length === 0) return null;

  return (
    <div className={`ali-sucre-slider slider-container relative overflow-hidden ${className}`}>
      <div className="slider-wrapper">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide ${index === currentSlide ? "active" : ""}`}
            data-slide={index}
            aria-hidden={index !== currentSlide}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title || `Bannière ${index + 1}`}
              className="w-full h-auto object-cover"
              style={{ maxHeight: "400px" }}
            />
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="slider-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-3 rounded-full hover:bg-black/75 transition"
            onClick={() => showSlide(currentSlide - 1)}
            aria-label="Slide précédent"
          >
            <i className="fas fa-chevron-left" aria-hidden />
          </button>
          <button
            type="button"
            className="slider-next absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-3 rounded-full hover:bg-black/75 transition"
            onClick={() => showSlide(currentSlide + 1)}
            aria-label="Slide suivant"
          >
            <i className="fas fa-chevron-right" aria-hidden />
          </button>
          <div className="slider-dots absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`slider-dot h-3 w-3 rounded-full ${
                  index === currentSlide ? "bg-white" : "bg-white/50"
                }`}
                onClick={() => showSlide(index)}
                aria-label={`Aller au slide ${index + 1}`}
                aria-current={index === currentSlide ? "true" : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
