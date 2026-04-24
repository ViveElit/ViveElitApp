import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

const PRESET_LOGOS = [
  { name: 'Grupo VIVE ELIT 1', url: '/Grupo VIVE ELIT 1.png' },
  { name: 'Grupo VIVE ELIT 2', url: '/Grupo VIVE ELIT 2.png' },
  { name: 'Grupo VIVE ELIT 3', url: '/Grupo VIVE ELIT 3.png' },
];

export function LogoLibrary() {
  const { setLogos } = useAppStore();
  const [presetFiles, setPresetFiles] = useState<(File | null)[]>([null, null, null]);
  const [selected, setSelected] = useState<boolean[]>([false, false, false]);
  const [customLogos, setCustomLogos] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadLogos() {
      const files = await Promise.all(
        PRESET_LOGOS.map(async ({ name, url }) => {
          const res = await fetch(url);
          const blob = await res.blob();
          return new File([blob], `${name}.png`, { type: 'image/png' });
        })
      );
      if (cancelled) return;
      setPresetFiles(files);
      setLoading(false);
    }
    loadLogos();
    return () => { cancelled = true; };
  }, []);

  const syncStore = (nextSelected: boolean[], nextCustom: File[]) => {
    const fromPresets = presetFiles.filter((f, i) => nextSelected[i] && f !== null) as File[];
    setLogos([...fromPresets, ...nextCustom].slice(0, 3));
  };

  const toggle = (index: number) => {
    const next = selected.map((v, i) => (i === index ? !v : v));
    setSelected(next);
    syncStore(next, customLogos);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setCustomLogos((prev) => {
      const next = [...prev, ...acceptedFiles];
      syncStore(selected, next);
      return next;
    });
  }, [selected, presetFiles]);

  const removeCustom = (index: number) => {
    setCustomLogos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncStore(selected, next);
      return next;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [], 'image/svg+xml': [] },
    maxFiles: 3,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-neutral-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Cargando logos…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preset library */}
      <div>
        <p className="text-xs text-neutral-500 mb-2">Biblioteca</p>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_LOGOS.map((logo, index) => (
            <button
              key={logo.name}
              onClick={() => toggle(index)}
              className={`relative rounded-xl border-2 p-2 aspect-square flex items-center justify-center transition-all ${
                selected[index]
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-neutral-700 bg-neutral-800/30 opacity-50 hover:opacity-75 hover:border-neutral-600'
              }`}
            >
              <img
                src={logo.url}
                alt={logo.name}
                className="max-w-full max-h-full object-contain"
              />
              {selected[index] && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom upload */}
      <div>
        <p className="text-xs text-neutral-500 mb-2">Logo personalizado</p>

        {customLogos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {customLogos.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative rounded-xl border-2 border-indigo-500 bg-indigo-500/10 p-2 aspect-square flex items-center justify-center"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain"
                />
                <button
                  onClick={() => removeCustom(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center hover:bg-neutral-600 transition-colors"
                >
                  <X className="w-3 h-3 text-neutral-300" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center transition-colors cursor-pointer text-center min-h-[72px]',
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/30'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-4 h-4 text-indigo-400 mb-1" />
          <p className="text-xs text-neutral-400">Arrastra o haz clic</p>
          <p className="text-[10px] text-neutral-600">PNG, JPG, SVG</p>
        </div>
      </div>
    </div>
  );
}
