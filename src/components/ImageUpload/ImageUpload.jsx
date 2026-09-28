import React, { useState, useRef, useCallback } from "react";
import { uploadImage, deleteImage } from "../../lib/storage";
import "./ImageUpload.css";

/**
 * ImageUpload component — drag-and-drop / click-to-browse / camera capture.
 *
 * Props:
 *   folder      {string}   - Storage folder: 'bucketList' | 'gaming' | 'creditCards' | 'uploads'
 *   currentUrl  {string}   - Existing image URL (to show preview and enable replace/delete)
 *   onUpload    {Function} - Called with (url: string) when upload completes
 *   onClear     {Function} - Called with () when image is removed
 *   label       {string}   - Optional label text
 *   accept      {string}   - MIME types (default: 'image/*')
 *   disabled    {boolean}  - Disable all interactions
 */
function ImageUpload({
  folder = "uploads",
  currentUrl = "",
  onUpload,
  onClear,
  label = "Upload Image",
  accept = "image/*",
  disabled = false,
}) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // null | 0-100
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(currentUrl);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Sync preview if parent updates currentUrl externally
  React.useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const processFile = useCallback(
    async (file) => {
      if (!file) return;

      const MAX_MB = 10;
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`File must be under ${MAX_MB} MB.`);
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        return;
      }

      setError("");
      setProgress(0);

      // Local preview
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      try {
        const downloadUrl = await uploadImage(file, folder, (pct) => {
          setProgress(pct);
        });
        setProgress(null);
        setPreview(downloadUrl);
        if (onUpload) onUpload(downloadUrl);
      } catch (err) {
        console.error("Upload failed:", err);
        setError("Upload failed. Please try again.");
        setProgress(null);
        setPreview(currentUrl); // revert
      }
    },
    [folder, currentUrl, onUpload]
  );

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── File Input ───────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  // ── Clear ────────────────────────────────────────────────────────────────────
  const handleClear = async () => {
    if (disabled) return;
    // If it's a Firebase Storage URL, delete from storage
    if (preview && preview.includes("firebasestorage")) {
      await deleteImage(preview);
    }
    setPreview("");
    setError("");
    if (onClear) onClear();
  };

  const isUploading = progress !== null;

  return (
    <div className={`image-upload-wrapper${disabled ? " image-upload-disabled" : ""}`}>
      {label && <span className="image-upload-label">{label}</span>}

      {/* Preview or Drop Zone */}
      {preview ? (
        <div className="image-upload-preview-container">
          <img src={preview} alt="Uploaded" className="image-upload-preview" />
          {isUploading && (
            <div className="image-upload-overlay">
              <div className="image-upload-progress-bar">
                <div
                  className="image-upload-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="image-upload-progress-text">{progress}%</span>
            </div>
          )}
          {!isUploading && !disabled && (
            <div className="image-upload-actions">
              <button
                type="button"
                className="image-upload-btn image-upload-btn-replace"
                onClick={() => fileInputRef.current?.click()}
                title="Replace image"
              >
                ✏️ Replace
              </button>
              <button
                type="button"
                className="image-upload-btn image-upload-btn-clear"
                onClick={handleClear}
                title="Remove image"
              >
                🗑️ Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`image-upload-dropzone${dragging ? " image-upload-dragging" : ""}${isUploading ? " image-upload-uploading" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          aria-label="Upload image — click or drag and drop"
        >
          {isUploading ? (
            <div className="image-upload-uploading-state">
              <div className="image-upload-spinner" />
              <div className="image-upload-progress-bar">
                <div
                  className="image-upload-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="image-upload-progress-text">Uploading… {progress}%</span>
            </div>
          ) : (
            <div className="image-upload-idle-state">
              <span className="image-upload-icon">{dragging ? "📂" : "🖼️"}</span>
              <span className="image-upload-main-text">
                {dragging ? "Drop to upload" : "Drag & drop or click to browse"}
              </span>
              <span className="image-upload-sub-text">PNG, JPG, GIF, WebP — up to 10 MB</span>
              {/* Camera button for mobile */}
              <button
                type="button"
                className="image-upload-camera-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
              >
                📷 Use Camera
              </button>
            </div>
          )}
        </div>
      )}

      {error && <span className="image-upload-error">⚠ {error}</span>}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: "none" }}
        disabled={disabled}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
        disabled={disabled}
      />
    </div>
  );
}

export default ImageUpload;
