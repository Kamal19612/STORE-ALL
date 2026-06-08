export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px] w-full p-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-b-2 border-primary/20"></div>
        <div className="absolute top-0 left-0 h-12 w-12 animate-spin rounded-full border-t-2 border-[#f5ad41]"></div>
      </div>
    </div>
  );
}
