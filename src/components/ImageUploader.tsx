import { useRef, useState } from 'react';

interface ImageUploaderProps {
  onImageSelect: (imageDataUrl: string) => void;
}

export function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      onImageSelect(result);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className="image-uploader-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="iconbtn hide-mobile"
        title="Image"
        onClick={handleClick}
      >
        🖼️
      </button>

      {preview && (
        <div className="image-preview-modal">
          <div className="image-preview-content">
            <img src={preview} alt="Aperçu" />
            <div className="image-preview-actions">
              <button type="button" onClick={clearPreview} className="btn-cancel">
                Annuler
              </button>
              <button type="button" onClick={() => { onImageSelect(preview); clearPreview(); }} className="btn-send">
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
