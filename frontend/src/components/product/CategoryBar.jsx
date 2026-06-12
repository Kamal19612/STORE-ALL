import { useRef } from "react";

const CategoryBar = ({
  selectedCategory,
  onSelectCategory,
  categories = [],
}) => {
  const scrollRef = useRef(null);

  // Construire la liste avec "Tous" + catégories dynamiques
  const allCategories = ["Tous", ...categories];

  return (
    <div className="relative w-full bg-white pt-0 pb-1 lg:hidden flex items-center overflow-hidden border-b border-gray-50 mb-0">
      <div className="flex items-center w-full px-1">
        {/* Categories Scroll - Pill Style Design */}
        <div
          ref={scrollRef}
          className="flex-1 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth items-center px-4 py-2"
        >
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                if (typeof onSelectCategory === 'function') {
                  onSelectCategory(cat);
                }
              }}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest transition-all duration-300 flex-shrink-0 ${
                selectedCategory === cat
                  ? "bg-primary text-secondary shadow-lg shadow-primary/20 scale-105"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryBar;
