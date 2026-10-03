import React, { useRef, useState } from 'react';
import { Button } from '../../../ui/Button';
import { Camera, Image as ImageIcon, Upload } from 'lucide-react';
import { ReportDraft } from '../ReportWizard';

interface Props {
  draft: ReportDraft;
  updateDraft: (u: Partial<ReportDraft>) => void;
  onNext: () => void;
}

export const CaptureStep: React.FC<Props> = ({ draft, updateDraft, onNext }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(draft.evidenceB64 ? `data:image/jpeg;base64,${draft.evidenceB64}` : null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const isVideo = file.type.startsWith('video');
      const b64 = isVideo ? await extractVideoFrames(file) : await downscaleImage(file);
      setPreview(`data:image/jpeg;base64,${b64}`);
      updateDraft({ evidenceB64: b64 });
    } catch (e) {
      console.error(e);
      alert("Failed to process media");
    } finally {
      setIsProcessing(false);
    }
  };

  const downscaleImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let w = img.width, h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h *= MAX_DIM / w; w = MAX_DIM; }
          else { w *= MAX_DIM / h; h = MAX_DIM; }
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl.split(',')[1]);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const extractVideoFrames = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.play().then(() => {
        const canvas = document.createElement('canvas');
        // Simplified: just grab one frame for demo or draw 3 side by side
        // To be quick, we'll grab a frame at 0.5s
        video.currentTime = 0.5;
        video.onseeked = () => {
          canvas.width = 400; canvas.height = 300;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, 400, 300);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl.split(',')[1]);
          video.pause();
        };
      });
    });
  };

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-display font-bold mb-2">What did you see?</h2>
      <p className="text-white/70 text-sm mb-8">Upload a photo or video of the water issue.</p>

      {preview ? (
        <div className="flex-1 flex flex-col">
          <div className="relative rounded-2xl overflow-hidden border-2 border-glow-aqua/30 aspect-square mb-6 bg-black flex items-center justify-center">
            <img src={preview} alt="Evidence" className="w-full h-full object-cover" />
            <button 
              onClick={() => { setPreview(null); updateDraft({ evidenceB64: '' }); }}
              className="absolute top-2 right-2 bg-black/50 p-2 rounded-full backdrop-blur text-sm"
            >
              Retake
            </button>
          </div>
          <div className="mt-auto">
            <Button className="w-full" size="lg" onClick={onNext}>Continue</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 justify-center items-center">
          <input 
            type="file" 
            accept="image/*,video/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-xs aspect-square border-2 border-dashed border-glow-aqua/30 rounded-3xl flex flex-col items-center justify-center text-glow-aqua hover:bg-glow-aqua/10 transition-colors"
          >
            {isProcessing ? (
              <span className="animate-pulse font-medium">Processing...</span>
            ) : (
              <>
                <Camera size={48} className="mb-4" />
                <span className="font-semibold text-lg">Take Photo</span>
              </>
            )}
          </button>
          
          <p className="text-white/50 text-sm mt-4">or select from gallery</p>
        </div>
      )}
    </div>
  );
};
