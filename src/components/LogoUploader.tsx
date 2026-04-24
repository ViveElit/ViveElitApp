import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

export const LogoUploader = () => {
    const { logos, addLogos, removeLogo } = useAppStore();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (logos.length + acceptedFiles.length > 3) {
            alert('Maximium 3 logos allowed.');
            return;
        }
        addLogos(acceptedFiles);
    }, [addLogos, logos.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/png': [], 'image/jpeg': [], 'image/svg+xml': [] },
        maxFiles: 3 - logos.length,
        disabled: logos.length >= 3,
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-neutral-300">Logos ({logos.length}/3)</h3>
                <p className="text-xs text-neutral-500">Auto-selects best match</p>
            </div>

            {logos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {logos.map((file, index) => (
                        <Card key={`${file.name}-${index}`} className="p-2 relative group flex flex-col items-center justify-center bg-neutral-800 border-neutral-700 aspect-square">
                            <div className="w-full h-full flex items-center justify-center p-1">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="Logo"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-600 border border-neutral-600"
                                onClick={() => removeLogo(index)}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </Card>
                    ))}
                </div>
            )}

            {logos.length < 3 && (
                <div
                    {...getRootProps()}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors cursor-pointer text-center min-h-[120px]",
                        isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-neutral-700 hover:border-neutral-600 bg-neutral-800/30"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="p-2 bg-neutral-800 rounded-full mb-2">
                        <Upload className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-white mb-0.5">
                        Add Logo
                    </p>
                    <p className="text-[10px] text-neutral-500">PNG, SVG</p>
                </div>
            )}
        </div>
    );
};
