import { useState, useRef } from 'react';
import { Search, Copy, Check, GripVertical, Loader2, ImageOff } from 'lucide-react';
import { fetchCloudinaryFolder } from '../services/cloudinaryService';
import { Button } from './ui/Button';

interface DraggableImageProps {
  url: string;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent) => void;
  isDraggingOver: boolean;
}

function DraggableImage({ url, index, onDragStart, onDragOver, onDrop, isDraggingOver }: DraggableImageProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={onDrop}
      className={`relative group w-36 aspect-square rounded-xl overflow-hidden border transition-all cursor-grab active:cursor-grabbing select-none shrink-0 ${
        isDraggingOver
          ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-500/20'
          : 'border-neutral-700/50 bg-neutral-800'
      }`}
    >
      <img
        src={url}
        alt={`Imagen ${index + 1}`}
        className="w-full h-full object-cover pointer-events-none"
        loading="lazy"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </span>
      <div className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

export function CloudinaryGallery() {
  const [folderName, setFolderName] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [draggingOverIndex, setDraggingOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsLoading(true);
    setError(null);
    setImages([]);

    try {
      const urls = await fetchCloudinaryFolder(folderName.trim());
      setImages(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggingOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    const toIndex = draggingOverIndex;

    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      setImages((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        return updated;
      });
    }

    dragIndexRef.current = null;
    setDraggingOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDraggingOverIndex(null);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(images, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-4 text-white">Extraer imágenes de Cloudinary</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Nombre de la carpeta en Cloudinary..."
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <Button type="submit" disabled={!folderName.trim() || isLoading} className="gap-2 shrink-0">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Buscar
          </Button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Gallery */}
      {images.length > 0 && (
        <>
          <div
            className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-6 backdrop-blur-sm"
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Galería — {images.length} imágenes
              </h3>
              <p className="text-xs text-neutral-500">Arrastra para reordenar</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {images.map((url, index) => (
                <DraggableImage
                  key={url}
                  url={url}
                  index={index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDraggingOver={draggingOverIndex === index}
                />
              ))}
            </div>
          </div>

          {/* JSON output */}
          <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">JSON resultado</h3>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar JSON
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-xs text-neutral-300 overflow-auto max-h-64 leading-relaxed">
              {JSON.stringify(images, null, 2)}
            </pre>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && images.length === 0 && !error && (
        <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-12 backdrop-blur-sm flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-700/50 flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-neutral-500" />
          </div>
          <div>
            <p className="text-neutral-400 font-medium">Escribe el nombre de una carpeta</p>
            <p className="text-neutral-600 text-sm mt-1">Las imágenes aparecerán aquí listas para reordenar</p>
          </div>
        </div>
      )}
    </div>
  );
}
