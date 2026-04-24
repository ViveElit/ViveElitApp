import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { X, Check, Move, Grid, Maximize } from 'lucide-react';
import { reprocessImage } from '../utils/logoPlacer';

interface LogoPlacementEditorProps {
    imageFile: File;
    logos: File[];
    initialConfig: {
        logoIndex: number;
        x: number;
        y: number;
        width: number;
        height: number;
    };
    onSave: (processedBlob: Blob, newConfig: { logoIndex: number; x: number; y: number; width: number; height: number; }) => void;
    onCancel: () => void;
}

export const LogoPlacementEditor: React.FC<LogoPlacementEditorProps> = ({
    imageFile,
    logos,
    initialConfig,
    onSave,
    onCancel
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Editor State
    const [logoIndex, setLogoIndex] = useState(initialConfig.logoIndex >= 0 ? initialConfig.logoIndex : 0);
    const [position, setPosition] = useState({ x: initialConfig.x, y: initialConfig.y });
    const [size, setSize] = useState({ width: initialConfig.width, height: initialConfig.height });
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1); // Viewport scale (still used for line widths)
    const [isProcessing, setIsProcessing] = useState(false);

    // UI Options
    const [showGuides, setShowGuides] = useState(true);
    const [showBorder, setShowBorder] = useState(false);

    // Load background image
    useEffect(() => {
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        img.onload = () => {
            setImage(img);
            if (canvasRef.current && containerRef.current) {
                // Fit to container
                const containerAspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
                const imgAspect = img.width / img.height;
                let displayWidth, displayHeight;

                if (imgAspect > containerAspect) {
                    displayWidth = containerRef.current.clientWidth;
                    // displayHeight = displayWidth / imgAspect;
                } else {
                    displayHeight = containerRef.current.clientHeight;
                    displayWidth = displayHeight * imgAspect;
                }

                setScale(displayWidth / img.width);
            }
        };
    }, [imageFile]);

    // Load logo image whenever logoIndex changes
    useEffect(() => {
        if (logos.length === 0) return;
        const currentLogo = logos[logoIndex];
        const img = new Image();
        img.src = URL.createObjectURL(currentLogo);
        img.onload = () => setLogoImage(img);
    }, [logos, logoIndex]);

    // Keyboard controls for fine tuning
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!image) return;
            const step = e.shiftKey ? 10 : 1;
            switch (e.key) {
                case 'ArrowUp': setPosition(p => ({ ...p, y: p.y - step })); break;
                case 'ArrowDown': setPosition(p => ({ ...p, y: p.y + step })); break;
                case 'ArrowLeft': setPosition(p => ({ ...p, x: p.x - step })); break;
                case 'ArrowRight': setPosition(p => ({ ...p, x: p.x + step })); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [image]);

    // Draw Canvas
    useEffect(() => {
        if (!canvasRef.current || !image || !logoImage) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        canvasRef.current.width = image.width;
        canvasRef.current.height = image.height;

        // Draw background
        ctx.drawImage(image, 0, 0);

        // Draw guides (Thirds + Center)
        if (showGuides) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 1 / scale;

            // Thirds
            const wThird = image.width / 3;
            const hThird = image.height / 3;

            ctx.beginPath();
            ctx.moveTo(wThird, 0); ctx.lineTo(wThird, image.height);
            ctx.moveTo(wThird * 2, 0); ctx.lineTo(wThird * 2, image.height);
            ctx.moveTo(0, hThird); ctx.lineTo(image.width, hThird);
            ctx.moveTo(0, hThird * 2); ctx.lineTo(image.width, hThird * 2);
            ctx.stroke();

            // Center Cross
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
            ctx.beginPath();
            ctx.moveTo(image.width / 2, 0); ctx.lineTo(image.width / 2, image.height);
            ctx.moveTo(0, image.height / 2); ctx.lineTo(image.width, image.height / 2);
            ctx.stroke();
        }

        // Draw logo
        ctx.drawImage(logoImage, position.x, position.y, size.width, size.height);

        // Draw highlight border if enabled or hovering/dragging
        if (!isProcessing && (showBorder || isHovering || isDragging)) {
            ctx.strokeStyle = showBorder ? '#6366f1' : 'rgba(99, 102, 241, 0.5)'; // Indigo-500
            ctx.lineWidth = 2 / scale;
            ctx.setLineDash([5 / scale, 5 / scale]);
            ctx.strokeRect(position.x, position.y, size.width, size.height);
        }

    }, [image, logoImage, position, size, scale, isProcessing, showGuides, showBorder, isHovering, isDragging]);

    // Lock body scroll on mount
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // --- MOUSE EVENT HANDLERS WITH ROBUST COORDINATE MAPPING ---

    const getCanvasCoordinates = (e: MouseEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        // Calculate scale dynamism based on actual rendered size vs internal resolution
        // This handles CSS resizing (maxWidth/maxHeight) correctly
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!canvasRef.current) return;

        const { x: mouseX, y: mouseY } = getCanvasCoordinates(e, canvasRef.current);

        // Hit test
        if (
            mouseX >= position.x &&
            mouseX <= position.x + size.width &&
            mouseY >= position.y &&
            mouseY <= position.y + size.height
        ) {
            setIsDragging(true);
            setDragStart({ x: mouseX - position.x, y: mouseY - position.y });
        }
    }, [position, size]);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging || !canvasRef.current) return;

        const { x: mouseX, y: mouseY } = getCanvasCoordinates(e, canvasRef.current);

        const hovering = (
            mouseX >= position.x &&
            mouseX <= position.x + size.width &&
            mouseY >= position.y &&
            mouseY <= position.y + size.height
        );

        if (hovering !== isHovering) {
            setIsHovering(hovering);
        }
    }, [isDragging, position, size, isHovering]);

    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (!isDragging || !canvasRef.current) return;
            e.preventDefault();

            const { x: mouseX, y: mouseY } = getCanvasCoordinates(e, canvasRef.current);

            setPosition({
                x: mouseX - dragStart.x,
                y: mouseY - dragStart.y
            });
        };

        const handleWindowMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [isDragging, dragStart]);


    // Track initial size for relative scaling
    const [initialSize] = useState({ width: initialConfig.width, height: initialConfig.height });

    // Resize Logic
    const handleScaleLogo = (factor: number) => {
        setSize({
            width: initialSize.width * factor,
            height: initialSize.height * factor
        });
    };

    const handleSave = async () => {
        if (!image || !logos[logoIndex]) return;
        setIsProcessing(true);
        try {
            const blob = await reprocessImage(
                imageFile,
                logos[logoIndex],
                position.x,
                position.y,
                size.width,
                size.height
            );

            onSave(blob, {
                logoIndex,
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height
            });
        } catch (error) {
            console.error(error);
            alert('Failed to save image');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
            <Card className="max-w-6xl w-full h-[90vh] flex flex-col p-0 bg-neutral-900 border-neutral-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Move className="w-5 h-5 text-indigo-400" />
                        Adjust Logo Placement
                    </h3>
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-4 mr-4">
                            {/* Toggles */}
                            <button
                                onClick={() => setShowGuides(!showGuides)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${showGuides ? 'bg-indigo-600/20 text-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <Grid className="w-3.5 h-3.5" />
                                Guides
                            </button>
                            <button
                                onClick={() => setShowBorder(!showBorder)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${showBorder ? 'bg-indigo-600/20 text-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <Maximize className="w-3.5 h-3.5" />
                                Border
                            </button>

                            <div className="w-px h-4 bg-neutral-800" />

                            <span className="text-xs text-neutral-400">Scale</span>
                            <input
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.05"
                                defaultValue="1"
                                onChange={(e) => handleScaleLogo(parseFloat(e.target.value))}
                                className="w-24 accent-indigo-500 cursor-pointer"
                            />
                        </div>
                        <div className="w-px h-8 bg-neutral-700 mx-2" />
                        <Button variant="ghost" onClick={onCancel}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Canvas Area */}
                    <div
                        ref={containerRef}
                        className="flex-1 bg-neutral-950 flex items-center justify-center relative overflow-hidden p-4"
                    >
                        <canvas
                            ref={canvasRef}
                            style={{
                                width: image ? image.width * scale : 'auto',
                                height: image ? image.height * scale : 'auto',
                                maxWidth: '100%',
                                maxHeight: '100%',
                                cursor: isDragging ? 'grabbing' : isHovering ? 'grab' : 'default'
                            }}
                            className="shadow-2xl"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseLeave={() => setIsHovering(false)}
                        />
                        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs pointer-events-none">
                            Drag logo to reposition • Arrow keys for fine tuning
                        </div>
                    </div>

                    {/* Sidebar Controls */}
                    <div className="w-64 bg-neutral-900 border-l border-neutral-800 p-4 space-y-6 overflow-y-auto">
                        <div>
                            <label className="text-sm font-medium text-neutral-400 mb-2 block">Select Logo</label>
                            <div className="grid grid-cols-2 gap-2">
                                {logos.map((logo, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setLogoIndex(idx)}
                                        className={`p-2 rounded-lg border cursor-pointer transition-all ${logoIndex === idx
                                            ? 'border-indigo-500 bg-indigo-500/10'
                                            : 'border-neutral-700 hover:border-neutral-600'
                                            }`}
                                    >
                                        <div className="aspect-square flex items-center justify-center bg-neutral-800 rounded mb-1 p-1">
                                            <img src={URL.createObjectURL(logo)} className="max-w-full max-h-full object-contain" alt="Logo option" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-neutral-800">
                            <Button
                                className="w-full"
                                onClick={handleSave}
                                isLoading={isProcessing}
                                disabled={isProcessing}
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};
