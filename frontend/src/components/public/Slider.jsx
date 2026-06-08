import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import sliderService from "../../services/sliderService";

const Slider = ({ className = "mb-8" }) => {
  const { storeCode } = useParams();
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const data = await sliderService.getPublicAll();
        // Filtrer uniquement les slides actifs
        setSlides(data.filter((s) => s.active) || []);
      } catch (error) {
        console.error("Erreur chargement slider:", error);
      }
    };
    fetchSlides();
  }, [storeCode]);

  useEffect(() => {
    const totalSlides = slides.length;
    if (totalSlides <= 1) return;
    
    // Défilement automatique toutes les 5 secondes
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const showSlide = (index) => {
    const totalSlides = slides.length;
    // Calculer le nouvel index avec modulo pour la boucle infinie
    setCurrentSlide((index + totalSlides) % totalSlides);
  };

  if (slides.length === 0) return null;

  return (
    <>
      <style>{`
        /* CSS isolé — .slider-container active les règles index.css (mobile + desktop) */
        .hero-carousel {
          position: relative;
          width: 100%;
        }

        .hero-wrapper {
          position: relative;
          width: 100%;
        }

        .hero-slide {
          display: none;
          width: 100%;
        }

        .hero-slide.active {
          display: block;
          animation: fadeInHero 0.5s ease-in-out;
        }

        @keyframes fadeInHero {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .hero-prev,
        .hero-next {
          cursor: pointer;
        }

        .hero-dot {
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .hero-slide img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 400px;
          object-fit: contain;
          object-position: center;
          border-radius: 15px;
        }

        @media (max-width: 768px) {
          .hero-prev,
          .hero-next {
            padding: 10px;
          }
        }
      `}</style>

      <div
        className={`hero-carousel slider-container max-w-full mx-auto overflow-hidden rounded-[15px] shadow-md relative ${className}`}
      >
        <div className="hero-wrapper">
          
          {/* Slides */}
          {slides.map((slide, index) => (
            <a 
              href={`#promo${index}`} 
              key={slide.id} 
              className={`hero-slide ${index === currentSlide ? "active" : ""}`}
            >
              <img src={slide.imageUrl} alt={slide.title || `Image ${index + 1}`} />
            </a>
          ))}

          {/* Contrôles (Uniquement si > 1 slide) */}
          {slides.length > 1 && (
            <>
              {/* Flèches de Navigation */}
              <button 
                onClick={(e) => { e.preventDefault(); showSlide(currentSlide - 1); }}
                className="hero-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
                aria-label="Précédent"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <button 
                onClick={(e) => { e.preventDefault(); showSlide(currentSlide + 1); }}
                className="hero-next absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
                aria-label="Suivant"
              >
                <i className="fas fa-chevron-right"></i>
              </button>

              {/* Points de Navigation (Dots) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.preventDefault(); showSlide(index); }}
                    className={`hero-dot w-3 h-3 rounded-full ${
                      index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                    aria-label={`Aller au slide ${index + 1}`}
                  ></button>
                ))}
              </div>
            </>
          )}
          
        </div>
      </div>
    </>
  );
};

export default Slider;
